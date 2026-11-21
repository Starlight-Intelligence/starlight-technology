begin;

insert into hardware.sources(id,adapter,rights_url,offer_hosts,enabled,archive_allowed,history_allowed,max_age_seconds)
values ('fixture','reviewed-manifest','https://example.invalid/license',array['example.invalid'],true,true,true,86400);
insert into hardware.evidence(source_id,url,observed_at,sha256)
values ('fixture','https://example.invalid/spec',now(),repeat('a',64));
insert into hardware.brands values ('fixture','Fixture');
insert into hardware.products values ('fixture','fixture','Fixture','desktop');
insert into hardware.variants
select 'fixture','fixture','fixture','Fixture','{}',id,now() from hardware.evidence where source_id='fixture';
insert into hardware.sellers
select 'fixture','Fixture','retailer',id from hardware.evidence where source_id='fixture';
set local role anon;
do $$
begin
  if has_schema_privilege('anon','hardware','USAGE')
    or has_function_privilege('anon','public.hardware_ingest_offer(jsonb)','EXECUTE') then
    raise exception 'Anonymous permissions are too broad';
  end if;
  if jsonb_array_length(public.hardware_catalog('NL')) <> 1 then raise exception 'Reviewed variant missing'; end if;
  if jsonb_array_length(public.hardware_catalog('FR')) <> 0 then raise exception 'Unsupported market leaked'; end if;
end $$;
reset role;
set local role hardware_ingestor;
do $$
declare
  payload jsonb := jsonb_build_object(
    'source_id','fixture','url','https://example.invalid/offer','observed_at',now(),
    'sha256',repeat('b',64),'external_id','merchant-1','market','NL','variant_id','fixture',
    'seller_id','fixture','condition','refurbished','currency','EUR','item_minor',100000,
    'shipping_minor',2000,'vat_mode','margin','availability','in_stock'
  );
begin
  perform public.hardware_ingest_offer(payload);
  perform public.hardware_ingest_offer(payload);
  begin
    perform public.hardware_ingest_offer(payload || '{"item_minor":99900}');
    raise exception 'Conflicting replay was accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.hardware_ingest_offer(payload || '{"url":"https://other.invalid/store"}');
    raise exception 'Unapproved offer host was accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.hardware_ingest_offer(payload || jsonb_build_object('observed_at',now()-interval '2 days'));
    raise exception 'Expired evidence was accepted';
  exception when invalid_parameter_value then null;
  end;
end $$;
reset role;
do $$
begin
  if (select count(*) from hardware.price_observations) <> 1 then raise exception 'Replay duplicated price'; end if;
  if (public.hardware_catalog('NL')->0->'offers'->0->>'itemMinor')::integer <> 100000
    then raise exception 'Approved offer missing from projection'; end if;
  if public.hardware_catalog('DE')->0->'offers' <> '[]'::jsonb then raise exception 'Wrong market leaked'; end if;
end $$;
update hardware.sources set enabled=false where id='fixture';
do $$
begin
  if public.hardware_catalog('NL')->0->'offers' <> '[]'::jsonb then raise exception 'Disabled source leaked'; end if;
end $$;
rollback;
