-- Ekzekuto këtë në Supabase SQL Editor

-- 1. Aktivizo pgvector
create extension if not exists vector;

-- 2. Tabela për dokumentet (RAG)
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(1536),
  source text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- 3. Tabela për sesionet (chat history)
create table if not exists sessions (
  id text primary key,
  messages jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Index për similarity search (i shpejtë)
create index if not exists documents_embedding_idx
  on documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 5. Funksioni i similarity search
create or replace function match_documents(
  query_embedding vector(1536),
  match_count int default 5
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
    id,
    content,
    source,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from documents
  order by embedding <=> query_embedding
  limit match_count;
$$;
