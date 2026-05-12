-- =============================================================================
-- euguide-ks — Database Schema i Plotë
-- =============================================================================
-- Ekzekuto në Supabase SQL Editor njëherë.
-- Idempotent: mund të ri-ekzekutohet pa probleme.
-- =============================================================================

-- 0. Extensions
create extension if not exists vector;
create extension if not exists pgcrypto;

-- =============================================================================
-- 1. PROFILES — user role (admin/user/editor)
-- =============================================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin', 'editor')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger: krijo profile automatikisht kur regjistrohet user i ri
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Helper: kontrollo nëse user aktual është admin
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role in ('admin', 'editor')
  );
$$ language sql security definer;

-- =============================================================================
-- 2. CMS — pages, sections, articles, faq_items, infographics
-- =============================================================================

create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_sq text, title_en text, title_sr text,
  hero_title_sq text, hero_title_en text, hero_title_sr text,
  hero_subtitle_sq text, hero_subtitle_en text, hero_subtitle_sr text,
  hero_image_url text,
  meta_description_sq text, meta_description_en text, meta_description_sr text,
  published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references pages(id) on delete cascade,
  title_sq text, title_en text, title_sr text,
  content_sq text, content_en text, content_sr text,
  image_url text,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists sections_page_id_idx on sections(page_id);
create index if not exists sections_sort_order_idx on sections(page_id, sort_order);

-- Categories (krijohet para articles për FK)
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_sq text not null,
  name_en text,
  name_sr text,
  description_sq text,
  description_en text,
  color text,
  created_at timestamptz default now()
);

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  page_id uuid references pages(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  author_id uuid references auth.users(id) on delete set null,
  title_sq text, title_en text, title_sr text,
  body_sq text, body_en text, body_sr text,
  excerpt_sq text, excerpt_en text, excerpt_sr text,
  cover_image_url text,
  view_count int default 0,
  published boolean default false,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists articles_slug_idx on articles(slug);
create index if not exists articles_page_id_idx on articles(page_id);
create index if not exists articles_published_idx on articles(published, published_at desc);

create table if not exists faq_items (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references pages(id) on delete set null,
  question_sq text, question_en text, question_sr text,
  answer_sq text, answer_en text, answer_sr text,
  sort_order int default 0,
  view_count int default 0,
  published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists faq_items_page_id_idx on faq_items(page_id);
create index if not exists faq_items_published_idx on faq_items(published, sort_order);

create table if not exists infographics (
  id uuid primary key default gen_random_uuid(),
  title_sq text, title_en text, title_sr text,
  description_sq text, description_en text, description_sr text,
  image_url text not null,
  category text,
  sort_order int default 0,
  download_count int default 0,
  published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists infographics_category_idx on infographics(category);
create index if not exists infographics_published_idx on infographics(published, sort_order);

-- Tags (m:n me articles)
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_sq text not null,
  name_en text
);

create table if not exists article_tags (
  article_id uuid references articles(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (article_id, tag_id)
);

create index if not exists article_tags_tag_idx on article_tags(tag_id);

-- =============================================================================
-- 3. AI — documents, sessions, uploaded_documents
-- =============================================================================

create table if not exists uploaded_documents (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_size_bytes int,
  file_type text,
  storage_path text,
  storage_url text,
  uploaded_by uuid references auth.users(id) on delete set null,
  chunks_count int default 0,
  language text default 'sq',
  status text default 'processing' check (status in ('processing', 'ready', 'failed')),
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists uploaded_documents_status_idx on uploaded_documents(status);
create index if not exists uploaded_documents_created_idx on uploaded_documents(created_at desc);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  uploaded_document_id uuid references uploaded_documents(id) on delete cascade,
  content text not null,
  embedding vector(1536),
  source text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists documents_embedding_idx
  on documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
create index if not exists documents_source_idx on documents(source);
create index if not exists documents_uploaded_idx on documents(uploaded_document_id);

-- Sessions (chat history)
drop table if exists sessions cascade;
create table sessions (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  language text default 'sq',
  messages jsonb default '[]',
  source text default 'chat' check (source in ('chat', 'voice', 'mixed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists sessions_user_id_idx on sessions(user_id);
create index if not exists sessions_updated_at_idx on sessions(updated_at desc);

-- match_documents RPC për RAG similarity search
create or replace function match_documents(
  query_embedding vector(1536),
  match_count int default 5,
  similarity_threshold float default 0.7
)
returns table (
  id uuid,
  content text,
  source text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    d.id,
    d.content,
    d.source,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity
  from documents d
  where 1 - (d.embedding <=> query_embedding) > similarity_threshold
  order by d.embedding <=> query_embedding
  limit match_count;
$$;

-- =============================================================================
-- 4. MEDIA LIBRARY
-- =============================================================================

create table if not exists media_library (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_size_bytes int,
  mime_type text,
  storage_path text not null,
  public_url text not null,
  alt_text_sq text,
  alt_text_en text,
  width int,
  height int,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists media_library_created_idx on media_library(created_at desc);

-- =============================================================================
-- 5. ACTIVITY LOG
-- =============================================================================

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  description text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists activity_log_user_idx on activity_log(user_id);
create index if not exists activity_log_created_idx on activity_log(created_at desc);
create index if not exists activity_log_entity_idx on activity_log(entity_type, entity_id);

-- =============================================================================
-- 6. TRIGGERS — updated_at automatik
-- =============================================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at_profiles on profiles;
create trigger set_updated_at_profiles
  before update on profiles for each row execute function set_updated_at();

drop trigger if exists set_updated_at_pages on pages;
create trigger set_updated_at_pages
  before update on pages for each row execute function set_updated_at();

drop trigger if exists set_updated_at_sections on sections;
create trigger set_updated_at_sections
  before update on sections for each row execute function set_updated_at();

drop trigger if exists set_updated_at_articles on articles;
create trigger set_updated_at_articles
  before update on articles for each row execute function set_updated_at();

drop trigger if exists set_updated_at_faq_items on faq_items;
create trigger set_updated_at_faq_items
  before update on faq_items for each row execute function set_updated_at();

drop trigger if exists set_updated_at_infographics on infographics;
create trigger set_updated_at_infographics
  before update on infographics for each row execute function set_updated_at();

drop trigger if exists set_updated_at_sessions on sessions;
create trigger set_updated_at_sessions
  before update on sessions for each row execute function set_updated_at();

drop trigger if exists set_updated_at_uploaded_documents on uploaded_documents;
create trigger set_updated_at_uploaded_documents
  before update on uploaded_documents for each row execute function set_updated_at();

-- =============================================================================
-- 7. RLS POLICIES
-- =============================================================================

-- PROFILES
alter table profiles enable row level security;
drop policy if exists "Users read own profile" on profiles;
create policy "Users read own profile" on profiles
  for select using (auth.uid() = id or is_admin());
drop policy if exists "Users update own profile" on profiles;
create policy "Users update own profile" on profiles
  for update using (auth.uid() = id);
drop policy if exists "Admin write profiles" on profiles;
create policy "Admin write profiles" on profiles
  for all using (is_admin()) with check (is_admin());

-- PAGES
alter table pages enable row level security;
drop policy if exists "Public read published pages" on pages;
create policy "Public read published pages" on pages
  for select using (published = true or is_admin());
drop policy if exists "Admin write pages" on pages;
create policy "Admin write pages" on pages
  for all using (is_admin()) with check (is_admin());

-- SECTIONS
alter table sections enable row level security;
drop policy if exists "Public read sections" on sections;
create policy "Public read sections" on sections for select using (true);
drop policy if exists "Admin write sections" on sections;
create policy "Admin write sections" on sections
  for all using (is_admin()) with check (is_admin());

-- ARTICLES
alter table articles enable row level security;
drop policy if exists "Public read published articles" on articles;
create policy "Public read published articles" on articles
  for select using (published = true or is_admin());
drop policy if exists "Admin write articles" on articles;
create policy "Admin write articles" on articles
  for all using (is_admin()) with check (is_admin());

-- FAQ_ITEMS
alter table faq_items enable row level security;
drop policy if exists "Public read published faq" on faq_items;
create policy "Public read published faq" on faq_items
  for select using (published = true or is_admin());
drop policy if exists "Admin write faq" on faq_items;
create policy "Admin write faq" on faq_items
  for all using (is_admin()) with check (is_admin());

-- INFOGRAPHICS
alter table infographics enable row level security;
drop policy if exists "Public read published infographics" on infographics;
create policy "Public read published infographics" on infographics
  for select using (published = true or is_admin());
drop policy if exists "Admin write infographics" on infographics;
create policy "Admin write infographics" on infographics
  for all using (is_admin()) with check (is_admin());

-- CATEGORIES
alter table categories enable row level security;
drop policy if exists "Public read categories" on categories;
create policy "Public read categories" on categories for select using (true);
drop policy if exists "Admin write categories" on categories;
create policy "Admin write categories" on categories
  for all using (is_admin()) with check (is_admin());

-- TAGS
alter table tags enable row level security;
drop policy if exists "Public read tags" on tags;
create policy "Public read tags" on tags for select using (true);
drop policy if exists "Admin write tags" on tags;
create policy "Admin write tags" on tags
  for all using (is_admin()) with check (is_admin());

-- ARTICLE_TAGS
alter table article_tags enable row level security;
drop policy if exists "Public read article_tags" on article_tags;
create policy "Public read article_tags" on article_tags for select using (true);
drop policy if exists "Admin write article_tags" on article_tags;
create policy "Admin write article_tags" on article_tags
  for all using (is_admin()) with check (is_admin());

-- SESSIONS (user sheh të vetin, admin sheh të gjitha, anonim mund të krijojë)
alter table sessions enable row level security;
drop policy if exists "Users see own sessions" on sessions;
create policy "Users see own sessions" on sessions
  for select using (auth.uid() = user_id or user_id is null or is_admin());
drop policy if exists "Users create sessions" on sessions;
create policy "Users create sessions" on sessions
  for insert with check (auth.uid() = user_id or user_id is null);
drop policy if exists "Users update own sessions" on sessions;
create policy "Users update own sessions" on sessions
  for update using (auth.uid() = user_id or user_id is null or is_admin());
drop policy if exists "Users delete own sessions" on sessions;
create policy "Users delete own sessions" on sessions
  for delete using (auth.uid() = user_id or is_admin());

-- DOCUMENTS (vetëm admin lexon nga klient; backend përdor service_role)
alter table documents enable row level security;
drop policy if exists "Admin read documents" on documents;
create policy "Admin read documents" on documents
  for select using (is_admin());

-- UPLOADED_DOCUMENTS
alter table uploaded_documents enable row level security;
drop policy if exists "Admin all uploaded_documents" on uploaded_documents;
create policy "Admin all uploaded_documents" on uploaded_documents
  for all using (is_admin()) with check (is_admin());

-- MEDIA_LIBRARY
alter table media_library enable row level security;
drop policy if exists "Public read media" on media_library;
create policy "Public read media" on media_library for select using (true);
drop policy if exists "Admin write media" on media_library;
create policy "Admin write media" on media_library
  for all using (is_admin()) with check (is_admin());

-- ACTIVITY_LOG
alter table activity_log enable row level security;
drop policy if exists "Admin read activity" on activity_log;
create policy "Admin read activity" on activity_log
  for select using (is_admin());
drop policy if exists "System write activity" on activity_log;
create policy "System write activity" on activity_log
  for insert with check (true);

-- =============================================================================
-- 8. STORAGE BUCKETS
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 10485760,
  array['image/png','image/jpeg','image/webp','image/svg+xml','image/gif']
) on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents', 'documents', false, 52428800,
  array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) on conflict (id) do nothing;

-- Storage RLS
drop policy if exists "Public read media bucket" on storage.objects;
create policy "Public read media bucket" on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists "Admin upload media" on storage.objects;
create policy "Admin upload media" on storage.objects
  for insert with check (bucket_id = 'media' and is_admin());

drop policy if exists "Admin update media" on storage.objects;
create policy "Admin update media" on storage.objects
  for update using (bucket_id = 'media' and is_admin());

drop policy if exists "Admin delete media" on storage.objects;
create policy "Admin delete media" on storage.objects
  for delete using (bucket_id = 'media' and is_admin());

drop policy if exists "Admin all documents bucket" on storage.objects;
create policy "Admin all documents bucket" on storage.objects
  for all using (bucket_id = 'documents' and is_admin())
  with check (bucket_id = 'documents' and is_admin());

-- =============================================================================
-- 9. SEED DATA
-- =============================================================================

-- 4 faqet kryesore
insert into pages (slug, title_sq, title_en, title_sr, published) values
  ('reforma',     'Reforma Administrative',     'Administrative Reform',    'Administrativna Reforma',  true),
  ('sundimi',     'Sundimi i Ligjit',           'Rule of Law',              'Vladavina Prava',          true),
  ('korrupsioni', 'Lufta kundër Korrupsionit',  'Fight Against Corruption', 'Borba protiv Korupcije',   true),
  ('be',          'Integrimi i Kosovës në BE',  'Kosovo EU Integration',    'Integracija Kosova u EU',  true)
on conflict (slug) do nothing;

-- Kategoritë bazë
insert into categories (slug, name_sq, name_en, name_sr, color) values
  ('lajme',    'Lajme',    'News',     'Vesti',     '#3b82f6'),
  ('analiza',  'Analiza',  'Analyses', 'Analize',   '#8b5cf6'),
  ('udhezues', 'Udhëzues', 'Guides',   'Vodiči',    '#10b981'),
  ('raporte',  'Raporte',  'Reports',  'Izveštaji', '#f59e0b')
on conflict (slug) do nothing;

-- =============================================================================
-- ADMIN BOOTSTRAP (ekzekuto MANUALISHT pas krijimit të user-it të parë)
-- =============================================================================
-- 1. Krijo user në Supabase: Authentication → Users → Add user (email+password)
-- 2. Pastaj ekzekuto:
--    update profiles set role = 'admin' where email = 'YOUR_EMAIL@gmail.com';
-- =============================================================================
