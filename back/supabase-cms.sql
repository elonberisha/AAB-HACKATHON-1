-- Ekzekuto këtë në Supabase SQL Editor (për web team)
-- Tabela CMS - gjithçka menaxhohet nga admin panel

create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_sq text, title_en text, title_sr text,
  hero_title_sq text, hero_title_en text,
  hero_subtitle_sq text, hero_subtitle_en text,
  hero_image_url text,
  published boolean default false,
  created_at timestamptz default now()
);

create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references pages(id) on delete cascade,
  title_sq text, title_en text, title_sr text,
  content_sq text, content_en text, content_sr text,
  image_url text,
  sort_order int default 0
);

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references pages(id) on delete set null,
  title_sq text, title_en text,
  body_sq text, body_en text,
  cover_image_url text,
  published boolean default false,
  published_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists faq_items (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references pages(id) on delete set null,
  question_sq text, question_en text, question_sr text,
  answer_sq text, answer_en text, answer_sr text,
  sort_order int default 0,
  published boolean default true
);

create table if not exists infographics (
  id uuid primary key default gen_random_uuid(),
  title_sq text, title_en text,
  image_url text not null,
  description_sq text, description_en text,
  sort_order int default 0,
  published boolean default true
);

-- Seed: faqet kryesore
insert into pages (slug, title_sq, title_en, published) values
  ('reforma',    'Reforma Administrative',          'Administrative Reform',   true),
  ('sundimi',    'Sundimi i Ligjit',                'Rule of Law',             true),
  ('korrupsioni','Lufta kundër Korrupsionit',       'Fight Against Corruption',true),
  ('be',         'Integrimi i Kosovës në BE',       'Kosovo EU Integration',   true)
on conflict (slug) do nothing;
