-- Read-only acceptance check for the local or isolated staging database.
do $$
declare
  variants integer;
  offers integer;
begin
  select count(*) into variants
  from hardware.variants v join hardware.products p on p.id=v.product_id
  where v.reviewed_at <= now() and p.category in ('mini','desktop','laptop')
    and v.specs ?& array['processor','ramGb','storageGb'];
  select count(*) into offers
  from hardware.offers o
  join hardware.variants v on v.id=o.variant_id and v.reviewed_at<=now()
  join hardware.sources s on s.id=o.source_id and s.enabled and s.history_allowed
  cross join lateral (
    select p.* from hardware.price_observations p
    where p.offer_id=o.id and p.observed_at<=now() order by p.observed_at desc limit 1
  ) latest
  where o.market in ('NL','DE') and latest.currency='EUR' and latest.item_minor>0
    and latest.availability in ('in_stock','backorder')
    and latest.observed_at>=now()-make_interval(secs=>s.max_age_seconds);
  if variants < 50 or offers < 100 then
    raise exception 'Hardware release incomplete: %/50 configurations, %/100 offers', variants, offers;
  end if;
  raise notice 'Hardware evidence threshold met: % configurations, % offers', variants, offers;
end $$;
