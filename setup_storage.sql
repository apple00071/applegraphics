
-- 1. Enable Storage extension (usually enabled by default)
-- create extension if not exists "uuid-ossp";

-- 2. Create the 'print-jobs' bucket
insert into storage.buckets (id, name, public)
values ('print-jobs', 'print-jobs', true) -- Using PUBLIC for easier access
on conflict (id) do nothing;

-- 3. Set up RLS Policies for 'print-jobs' bucket

-- ALLOW Uploads for anyone (including anon)
create policy "Allow Public Uploads"
on storage.objects for insert
with check ( bucket_id = 'print-jobs' );

-- ALLOW Downloads/Select for anyone
create policy "Allow Public Downloads"
on storage.objects for select
using ( bucket_id = 'print-jobs' );

-- ALLOW Updates (optional, for overwriting)
create policy "Allow Public Updates"
on storage.objects for update
using ( bucket_id = 'print-jobs' );
