begin;
create schema hardware;
create role hardware_ingestor nologin;
grant hardware_ingestor to authenticator;
grant usage on schema public to hardware_ingestor;
revoke all on schema hardware from public, anon, authenticated;
alter default privileges in schema hardware revoke execute on functions from public;

create table hardware.sources (
  id text primary key,
  adapter text not null check (adapter in ('reviewed-manifest', 'licensed-feed')),
  rights_url text not null check (rights_url like 'https://%'),
  offer_hosts text[] not null default array[]::text[],
  enabled boolean not null default false,
  archive_allowed boolean not null default false,
  history_allowed boolean not null default false,
  max_age_seconds integer not null check (max_age_seconds between 60 and 2592000),
  check (not archive_allowed or history_allowed)
);
create table hardware.evidence (
  id bigint generated always as identity primary key,
  source_id text not null references hardware.sources,
  url text not null check (url like 'https://%'),
  observed_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  object_key text,
  unique (source_id, url, observed_at, sha256)
);
create table hardware.brands (id text primary key, name text not null unique);
create table hardware.products (
  id text primary key, brand_id text not null references hardware.brands,
  name text not null, category text not null check (category in ('desktop','mini','laptop','component','build')),
  unique (brand_id, name)
);
create table hardware.variants (
  id text primary key, product_id text not null references hardware.products,
  exact_key text not null, label text not null,
  specs jsonb not null check (jsonb_typeof(specs) = 'object'),
  evidence_id bigint not null references hardware.evidence,
  reviewed_at timestamptz,
  unique (product_id, exact_key)
);
create table hardware.identifiers (
  namespace text not null, issuer text not null, normalized_value text not null,
  variant_id text not null references hardware.variants, evidence_id bigint not null references hardware.evidence,
  primary key (namespace, issuer, normalized_value),
  check (namespace in ('gtin','mpn','merchant-sku','asin','oem-config'))
);
create table hardware.components (
  assembly_id text references hardware.variants, slot text not null,
  component_id text not null references hardware.variants,
  quantity integer not null default 1 check (quantity > 0),
  evidence_id bigint not null references hardware.evidence,
  primary key (assembly_id, slot, component_id), check (assembly_id <> component_id)
);
create table hardware.compatibility (
  host_id text references hardware.variants, candidate_id text references hardware.variants,
  dimension text not null, outcome text not null check (outcome in ('pass','fail','unknown')),
  rationale text not null, evidence_id bigint not null references hardware.evidence,
  primary key (host_id, candidate_id, dimension), check (host_id <> candidate_id)
);
create table hardware.upgrade_paths (
  host_id text references hardware.variants, target_id text references hardware.variants,
  action text not null, evidence_id bigint not null references hardware.evidence,
  primary key (host_id, target_id), check (host_id <> target_id)
);
create table hardware.sellers (
  id text primary key, display_name text not null,
  kind text not null check (kind in ('direct','retailer','marketplace','private')),
  evidence_id bigint not null references hardware.evidence
);
create table hardware.seller_signals (
  seller_id text references hardware.sellers, dimension text not null check (dimension in ('identity','returns','warranty','payment','invoice')),
  outcome text not null check (outcome in ('pass','fail','unknown')),
  evidence_id bigint not null references hardware.evidence,
  primary key (seller_id, dimension)
);
create table hardware.offers (
  id bigint generated always as identity primary key,
  source_id text not null references hardware.sources, external_id text not null,
  variant_id text not null references hardware.variants, seller_id text not null references hardware.sellers,
  market text not null check (market ~ '^[A-Z]{2}$'),
  condition text not null check (condition in ('new','refurbished','used')),
  url text not null check (url like 'https://%'),
  unique (source_id, external_id, market),
  unique (seller_id, variant_id, market, condition, url)
);
create index hardware_offer_variant_market on hardware.offers (variant_id, market);
create table hardware.price_observations (
  offer_id bigint references hardware.offers, observed_at timestamptz,
  currency text not null check (currency in ('EUR','USD','GBP')),
  item_minor integer not null check (item_minor >= 0),
  shipping_minor integer check (shipping_minor >= 0),
  vat_minor integer check (vat_minor between 0 and item_minor + coalesce(shipping_minor,0)),
  vat_mode text not null check (vat_mode in ('invoice','margin','private','unknown')),
  availability text not null check (availability in ('in_stock','backorder','unavailable','unknown')),
  evidence_id bigint not null references hardware.evidence,
  primary key (offer_id, observed_at),
  check ((vat_mode = 'invoice') = (vat_minor is not null)),
  check (vat_minor is null or shipping_minor is not null)
);
create table hardware.secondhand_listings (
  offer_id bigint primary key references hardware.offers, grade text not null,
  warranty_months integer check (warranty_months >= 0),
  evidence_id bigint not null references hardware.evidence
);
create table hardware.sold_comparables (
  source_id text references hardware.sources, external_id text,
  variant_id text not null references hardware.variants,
  market text not null check (market ~ '^[A-Z]{2}$'),
  grade text not null, sold_at timestamptz not null,
  currency text not null check (currency in ('EUR','USD','GBP')),
  realized_minor integer not null check (realized_minor > 0),
  evidence_id bigint not null references hardware.evidence,
  primary key (source_id, external_id)
);
create table hardware.workloads (
  id text, version integer check (version > 0),
  title text not null, protocol jsonb not null check (jsonb_typeof(protocol) = 'object'),
  primary key (id, version)
);
create table hardware.benchmark_runs (
  id text primary key, variant_id text not null references hardware.variants,
  workload_id text not null, workload_version integer not null,
  basis text not null check (basis in ('measured','third-party','modeled')),
  environment jsonb not null, attempted integer not null check (attempted > 0),
  completed integer not null check (completed between 0 and attempted),
  wall_wh numeric not null check (wall_wh >= 0),
  cost_minor numeric not null check (cost_minor >= 0),
  currency text not null check (currency in ('EUR','USD','GBP')),
  evidence_id bigint not null references hardware.evidence,
  foreign key (workload_id, workload_version) references hardware.workloads
);
create table hardware.affiliate_attribution (
  offer_id bigint primary key references hardware.offers, program text not null,
  destination text not null check (destination ~ '^https://[a-zA-Z0-9.-]+(/|$)'),
  approved_at timestamptz not null, expires_at timestamptz not null,
  evidence_id bigint not null references hardware.evidence,
  check (expires_at > approved_at)
);

-- The Worker gets one write procedure. Catalog identities and publishing remain review operations.
create function public.hardware_ingest_offer(payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  policy hardware.sources%rowtype;
  evidence bigint;
  offer bigint;
  seen timestamptz := (payload->>'observed_at')::timestamptz;
begin
  select * into strict policy from hardware.sources where id = payload->>'source_id' and enabled for share;
  if seen is null or seen > now() + interval '5 minutes'
    or seen < now() - make_interval(secs => policy.max_age_seconds)
    or not policy.history_allowed
    or not coalesce(substring(payload->>'url' from '^https://([a-z0-9.-]+)(/|$)') = any(policy.offer_hosts),false)
    or ((payload->>'object_key') is not null and payload->>'object_key' <>
      'hardware/' || policy.id || '/' || (payload->>'sha256') || '.json')
    or (payload->>'object_key' is not null and not policy.archive_allowed) then
    raise exception 'Observation violates source policy' using errcode = '22023';
  end if;
  if not exists (select 1 from hardware.variants where id = payload->>'variant_id' and reviewed_at <= now()) then
    raise exception 'Unreviewed exact variant' using errcode = '22023';
  end if;
  insert into hardware.evidence (source_id,url,observed_at,sha256,object_key)
    values (policy.id,payload->>'url',seen,payload->>'sha256',payload->>'object_key')
    on conflict (source_id,url,observed_at,sha256) do update set sha256 = excluded.sha256
    returning id into evidence;
  insert into hardware.offers (source_id,external_id,market,variant_id,seller_id,condition,url)
    values (policy.id,payload->>'external_id',payload->>'market',payload->>'variant_id',
      payload->>'seller_id',payload->>'condition',payload->>'url')
    on conflict (source_id,external_id,market) do update set external_id = excluded.external_id
    where (offers.variant_id, offers.seller_id, offers.condition, offers.url) =
      (excluded.variant_id, excluded.seller_id, excluded.condition, excluded.url)
    returning id into offer;
  if offer is null then
    raise exception 'Offer identity changed; manual reconciliation required' using errcode = '22023';
  end if;
  insert into hardware.price_observations
    (offer_id,observed_at,currency,item_minor,shipping_minor,vat_minor,vat_mode,availability,evidence_id)
    values (offer,seen,payload->>'currency',(payload->>'item_minor')::integer,
      (payload->>'shipping_minor')::integer,(payload->>'vat_minor')::integer,
      payload->>'vat_mode',payload->>'availability',evidence)
    on conflict do nothing;
  if not found and not exists (
    select 1 from hardware.price_observations p
    where p.offer_id = offer and p.observed_at = seen and p.evidence_id = evidence
      and (p.currency,p.item_minor,p.shipping_minor,p.vat_minor,p.vat_mode,p.availability) is not distinct from
      (payload->>'currency',(payload->>'item_minor')::integer,(payload->>'shipping_minor')::integer,
       (payload->>'vat_minor')::integer,payload->>'vat_mode',payload->>'availability')
  ) then raise exception 'Conflicting observation at same timestamp' using errcode = '22023'; end if;
end $$;
revoke all on function public.hardware_ingest_offer(jsonb) from public, anon, authenticated;
grant execute on function public.hardware_ingest_offer(jsonb) to hardware_ingestor;

create function public.hardware_ingest_policy(requested_source text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('adapter',adapter,'archiveAllowed',archive_allowed,'maxAge',max_age_seconds)
  from hardware.sources where id=requested_source and enabled and history_allowed
$$;
revoke all on function public.hardware_ingest_policy(text) from public, anon, authenticated;
grant execute on function public.hardware_ingest_policy(text) to hardware_ingestor;

create function public.hardware_catalog(requested_market text default 'NL') returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(catalog) order by catalog.id), '[]'::jsonb)
  from (
    select v.id, b.name as brand, p.name as product, p.category, v.label, v.specs,
      e.url as "sourceUrl", e.observed_at as "observedAt",
      coalesce((select jsonb_agg(jsonb_build_object('id',o.id::text,'seller',s.display_name,
        'url',o.url,'currency',latest.currency,'itemMinor',latest.item_minor,
        'shippingMinor',latest.shipping_minor,'vatMinor',latest.vat_minor,'vatMode',latest.vat_mode,
        'condition',o.condition,'availability',latest.availability,'observedAt',latest.observed_at,
        'risk', arrays.signals, 'affiliateUrl', attribution.destination,
        'history', history.points, 'grade', used.grade, 'warrantyMonths', used.warranty_months) order by o.id)
        from hardware.offers o
        join hardware.sources policy on policy.id = o.source_id and policy.enabled
        join hardware.sellers s on s.id = o.seller_id
        cross join lateral (select po.* from hardware.price_observations po where po.offer_id=o.id
          and po.observed_at <= now() order by po.observed_at desc limit 1) latest
        cross join lateral (select coalesce(jsonb_object_agg(ss.dimension,ss.outcome),'{}'::jsonb) as signals
          from hardware.seller_signals ss join hardware.evidence se on se.id=ss.evidence_id
          where ss.seller_id=s.id and se.observed_at between now()-interval '90 days' and now()) arrays
        left join hardware.secondhand_listings used on used.offer_id=o.id and o.condition <> 'new'
        left join hardware.affiliate_attribution attribution on attribution.offer_id=o.id
          and attribution.approved_at <= now() and attribution.expires_at > now()
        cross join lateral (
          select coalesce(jsonb_agg(jsonb_build_object('observedAt',hp.observed_at,'itemMinor',hp.item_minor,
            'currency',hp.currency,'url',he.url) order by hp.observed_at desc),'[]'::jsonb) as points
          from (select ph.* from hardware.price_observations ph where ph.offer_id=o.id
            and ph.observed_at < latest.observed_at order by ph.observed_at desc limit 10) hp
          join hardware.evidence he on he.id=hp.evidence_id where policy.history_allowed
        ) history
        where o.variant_id=v.id and o.market=requested_market
          and latest.observed_at >= now()-make_interval(secs=>policy.max_age_seconds)), '[]'::jsonb) as offers,
      coalesce((select jsonb_agg(jsonb_build_object('targetId',u.target_id,'action',u.action,'url',ue.url))
        from hardware.upgrade_paths u join hardware.evidence ue on ue.id=u.evidence_id
        join hardware.variants target on target.id=u.target_id and target.reviewed_at<=now()
        where u.host_id=v.id),'[]'::jsonb) as upgrades,
      coalesce((select jsonb_agg(jsonb_build_object('workload',r.workload_id,'version',r.workload_version,
        'basis',r.basis,'completed',r.completed,'attempted',r.attempted,'wallWh',r.wall_wh,
        'costMinor',r.cost_minor,'currency',r.currency,'url',re.url))
        from hardware.benchmark_runs r join hardware.evidence re on re.id=r.evidence_id where r.variant_id=v.id),'[]'::jsonb) as benchmarks,
      coalesce((select jsonb_agg(jsonb_build_object('slot',c.slot,'id',c.component_id,'quantity',c.quantity))
        from hardware.components c where c.assembly_id=v.id),'[]'::jsonb) as components,
      coalesce((select jsonb_agg(jsonb_build_object('candidateId',cc.candidate_id,
        'dimension',cc.dimension,'outcome',cc.outcome,'rationale',cc.rationale,'url',ce.url))
        from hardware.compatibility cc join hardware.evidence ce on ce.id=cc.evidence_id where cc.host_id=v.id),'[]'::jsonb) as compatibility,
      coalesce((select jsonb_agg(to_jsonb(recent) order by recent."soldAt" desc) from (
        select sc.sold_at as "soldAt", sc.realized_minor as "realizedMinor", sc.grade, sc.currency, se.url
        from hardware.sold_comparables sc join hardware.evidence se on se.id=sc.evidence_id
        join hardware.sources sp on sp.id=sc.source_id and sp.enabled and sp.history_allowed
        where sc.variant_id=v.id and sc.market=requested_market and sc.sold_at <= now()
        order by sc.sold_at desc limit 10
      ) recent),'[]'::jsonb) as sold
    from hardware.variants v join hardware.products p on p.id=v.product_id join hardware.brands b on b.id=p.brand_id
    join hardware.evidence e on e.id=v.evidence_id
    where v.reviewed_at <= now() and requested_market in ('NL','DE')
  ) catalog
$$;
revoke all on function public.hardware_catalog(text) from public;
grant execute on function public.hardware_catalog(text) to anon, authenticated;

commit;
