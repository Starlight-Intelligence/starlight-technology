begin;

-- Keep these relations out of the Supabase Data API exposed schemas.
create schema compute_intelligence;
revoke all on schema compute_intelligence from public, anon, authenticated, service_role;

create table compute_intelligence.source (
  id text primary key,
  url text not null check (url like 'https://%'),
  collection_mode text not null default 'manual' check (collection_mode in ('manual', 'authorized_feed')),
  automation_approved boolean not null default false,
  artifact_retention_days integer not null default 0 check (artifact_retention_days between 0 and 365),
  check (not automation_approved or collection_mode = 'authorized_feed')
);

create table compute_intelligence.variant (
  id text primary key,
  atlas_id text,
  sku text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object')
);

create table compute_intelligence.observation (
  observation_hash text primary key check (observation_hash ~ '^[a-f0-9]{64}$'),
  offer_id text not null,
  variant_id text not null references compute_intelligence.variant,
  source_id text not null references compute_intelligence.source,
  seller text,
  market text not null,
  ships_to_nl boolean,
  shipping_minor bigint check (shipping_minor >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  amount_minor bigint not null check (amount_minor > 0),
  tax_basis text not null check (tax_basis in ('gross', 'net', 'unknown')),
  availability text not null check (availability in ('listed','in-stock','out-of-stock','backorder','unknown')),
  price_unit text not null check (price_unit in ('purchase', 'hour')),
  read_on date not null,
  capture_age_days integer not null check (capture_age_days >= 0),
  evidence_status text not null check (evidence_status in ('source-read', 'ambiguous-lead')),
  note text not null,
  artifact_sha256 text check (artifact_sha256 ~ '^[a-f0-9]{64}$')
);

create index compute_observation_variant_read on compute_intelligence.observation (variant_id, read_on desc);

alter table compute_intelligence.source enable row level security;
alter table compute_intelligence.variant enable row level security;
alter table compute_intelligence.observation enable row level security;
revoke all on all tables in schema compute_intelligence from public, anon, authenticated, service_role;

-- Deployment provisions an existing platform-managed service identity with table-specific
-- grants and RLS policies after review. This migration grants no runtime access.
commit;
