-- ============================================================
-- 게시판 프로젝트 Supabase 스키마 + RLS 정책
-- Supabase 대시보드 > SQL Editor 에서 전체를 한 번에 실행하세요.
-- 출처가 불명확한 기존 테이블(정수 id + name_ko 구조의 categories 등)이
-- 남아있을 수 있어, 실행 전에 관련 객체를 먼저 깨끗이 지웁니다.
-- 현재 이 프로젝트에는 실제 사용자 데이터가 없는 것으로 확인했습니다.
-- ============================================================

drop view if exists rolling_paper_messages_public cascade;
drop view if exists rolling_papers_public cascade;
drop table if exists admin_activity_logs cascade;
drop table if exists user_restrictions cascade;
drop table if exists notices cascade;
drop table if exists report_actions cascade;
drop table if exists reports cascade;
drop table if exists rolling_paper_reactions cascade;
drop table if exists rolling_paper_messages cascade;
drop table if exists rolling_papers cascade;
drop table if exists post_bookmarks cascade;
drop table if exists post_likes cascade;
drop table if exists comments cascade;
drop table if exists posts cascade;
drop table if exists categories cascade;
drop table if exists profiles cascade;
drop function if exists is_admin() cascade;
drop function if exists handle_new_user() cascade;
drop function if exists prevent_role_self_elevation() cascade;
drop function if exists protect_post_moderation_fields() cascade;
drop function if exists increment_post_view(uuid) cascade;
drop function if exists bump_post_comment_count() cascade;
drop function if exists bump_post_like_count() cascade;
drop function if exists bump_post_vote_counts() cascade;
drop function if exists create_rolling_paper(text, uuid, text, text, text, text, boolean, timestamptz) cascade;
drop function if exists verify_rolling_paper_passkey(uuid, text) cascade;
drop function if exists can_access_rolling_paper(uuid) cascade;
drop function if exists post_rolling_paper_message(uuid, text, boolean, text) cascade;
drop trigger if exists on_auth_user_created on auth.users;

-- Supabase는 보통 pgcrypto를 extensions 스키마에 설치한다. 아래 함수들의
-- search_path에 extensions를 함께 넣어서 이미 설치된 위치와 무관하게 digest()를 찾게 한다.
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. profiles (auth.users 1:1 확장)
-- ------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique,
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'restricted', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function is_admin() returns boolean
language sql stable as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

-- 회원가입 시 auth.users에 자동으로 profiles 행 생성 (닉네임은 회원가입 시 metadata로 전달)
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  insert into profiles (id, nickname)
  values (new.id, coalesce(new.raw_user_meta_data->>'nickname', '사용자' || substr(new.id::text, 1, 8)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- role은 반드시 관리자만 변경 가능 (본인이 스스로 admin으로 못 바꾸게)
create function prevent_role_self_elevation() returns trigger
language plpgsql as $$
begin
  if new.role <> old.role and not is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on profiles
  for each row execute function prevent_role_self_elevation();

alter table profiles enable row level security;
create policy profiles_select_all on profiles for select using (true);
create policy profiles_update_own on profiles for update using (auth.uid() = id or is_admin());

-- ------------------------------------------------------------
-- 2. categories (관리자가 추가/수정/삭제)
-- ------------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table categories enable row level security;
create policy categories_select_all on categories for select using (true);
create policy categories_admin_write on categories for all using (is_admin()) with check (is_admin());

insert into categories (name, slug, sort_order) values
  ('유머', 'humor', 1),
  ('개그', 'gag', 2),
  ('연예인', 'celebrity', 3),
  ('시사', 'issue', 4),
  ('기사', 'news', 5),
  ('자유게시판', 'free', 6),
  ('게임', 'game', 7),
  ('영화/드라마', 'movie', 8),
  ('음악', 'music', 9),
  ('스포츠', 'sports', 10);

-- ------------------------------------------------------------
-- 3. posts
-- ------------------------------------------------------------
create table posts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id),
  author_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  content text not null,
  color text,
  tag text,
  view_count integer not null default 0,
  like_count integer not null default 0,
  dislike_count integer not null default 0,
  comment_count integer not null default 0,
  is_pinned boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_category_idx on posts(category_id, created_at desc);

-- 작성자는 title/content/category/color/tag만 고칠 수 있고, pin/삭제/카운터는 관리자 또는 전용 함수로만 변경
create function protect_post_moderation_fields() returns trigger
language plpgsql as $$
begin
  if not is_admin() then
    new.is_pinned := old.is_pinned;
    new.view_count := old.view_count;
    new.like_count := old.like_count;
    new.dislike_count := old.dislike_count;
    new.comment_count := old.comment_count;
    if new.is_deleted and not old.is_deleted then
      -- 일반 사용자의 삭제는 허용(자기 글 소프트 삭제), 그 외 is_deleted 되돌리기는 금지
    elsif new.is_deleted <> old.is_deleted then
      new.is_deleted := old.is_deleted;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger posts_protect_fields
  before update on posts
  for each row execute function protect_post_moderation_fields();

alter table posts enable row level security;
create policy posts_select_public on posts for select using (not is_deleted or is_admin() or author_id = auth.uid());
create policy posts_insert_own on posts for insert with check (auth.uid() is not null and author_id = auth.uid());
create policy posts_update_own_or_admin on posts for update using (author_id = auth.uid() or is_admin());
create policy posts_delete_admin_only on posts for delete using (is_admin());

-- 조회수 증가 (누구나, 세션당 1회는 클라이언트에서 제어)
create function increment_post_view(p_post_id uuid) returns void
language sql security definer set search_path = public, extensions as $$
  update posts set view_count = view_count + 1 where id = p_post_id and not is_deleted;
$$;
grant execute on function increment_post_view(uuid) to anon, authenticated;

-- ------------------------------------------------------------
-- 4. comments
-- ------------------------------------------------------------
create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  parent_id uuid references comments(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index comments_post_idx on comments(post_id, created_at asc);

-- 답글은 1단계까지만 허용 (답글에 또 답글 금지 — 대부분의 게시판과 동일한 깊이)
create function enforce_comment_depth() returns trigger
language plpgsql as $$
begin
  if new.parent_id is not null and exists (
    select 1 from comments where id = new.parent_id and parent_id is not null
  ) then
    raise exception '답글에는 답글을 달 수 없습니다';
  end if;
  return new;
end;
$$;
create trigger comments_enforce_depth
  before insert on comments
  for each row execute function enforce_comment_depth();

create function bump_post_comment_count() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if tg_op = 'INSERT' then
    update posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'UPDATE' and new.is_deleted and not old.is_deleted then
    update posts set comment_count = greatest(comment_count - 1, 0) where id = new.post_id;
  end if;
  return new;
end;
$$;

create trigger comments_after_insert
  after insert on comments
  for each row execute function bump_post_comment_count();
create trigger comments_after_soft_delete
  after update on comments
  for each row execute function bump_post_comment_count();

alter table comments enable row level security;
create policy comments_select_public on comments for select using (not is_deleted or is_admin() or author_id = auth.uid());
create policy comments_insert_own on comments for insert with check (auth.uid() is not null and author_id = auth.uid());
create policy comments_update_own_or_admin on comments for update using (author_id = auth.uid() or is_admin());
create policy comments_delete_admin_only on comments for delete using (is_admin());

-- ------------------------------------------------------------
-- 5. post_likes (추천/비추천 — value: 1=추천, -1=비추천)
-- ------------------------------------------------------------
create table post_likes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  value smallint not null check (value in (1, -1)),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create function bump_post_vote_counts() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if tg_op = 'INSERT' then
    update posts set
      like_count = like_count + (case when new.value = 1 then 1 else 0 end),
      dislike_count = dislike_count + (case when new.value = -1 then 1 else 0 end)
    where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update posts set
      like_count = greatest(like_count - (case when old.value = 1 then 1 else 0 end), 0),
      dislike_count = greatest(dislike_count - (case when old.value = -1 then 1 else 0 end), 0)
    where id = old.post_id;
  elsif tg_op = 'UPDATE' and new.value <> old.value then
    update posts set
      like_count = greatest(like_count + (case when new.value = 1 then 1 when old.value = 1 then -1 else 0 end), 0),
      dislike_count = greatest(dislike_count + (case when new.value = -1 then 1 when old.value = -1 then -1 else 0 end), 0)
    where id = new.post_id;
  end if;
  return null;
end;
$$;

create trigger post_likes_after_change
  after insert or update or delete on post_likes
  for each row execute function bump_post_vote_counts();

alter table post_likes enable row level security;
create policy post_likes_select_all on post_likes for select using (true);
create policy post_likes_insert_own on post_likes for insert with check (auth.uid() = user_id);
create policy post_likes_update_own on post_likes for update using (auth.uid() = user_id);
create policy post_likes_delete_own on post_likes for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 5b. post_bookmarks (스크랩)
-- ------------------------------------------------------------
create table post_bookmarks (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table post_bookmarks enable row level security;
create policy bookmarks_select_own on post_bookmarks for select using (auth.uid() = user_id);
create policy bookmarks_insert_own on post_bookmarks for insert with check (auth.uid() = user_id);
create policy bookmarks_delete_own on post_bookmarks for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 6. rolling_papers (passkey_hash는 뷰에서 절대 노출하지 않음)
-- ------------------------------------------------------------
create table rolling_papers (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles(id) on delete cascade,
  category_id uuid references categories(id),
  title text not null,
  target_subject text,
  description text,
  visibility text not null default 'public' check (visibility in ('public', 'passkey')),
  passkey_hash text,
  allow_anonymous boolean not null default true,
  deadline timestamptz,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (visibility = 'public' or passkey_hash is not null)
);

alter table rolling_papers enable row level security;
-- 테이블 자체는 RLS로 막고, 안전한 뷰로만 조회 (passkey_hash 노출 방지)
create policy rolling_papers_no_direct_select on rolling_papers for select using (false);
create policy rolling_papers_insert_own on rolling_papers for insert with check (auth.uid() is not null and creator_id = auth.uid());
create policy rolling_papers_update_own_or_admin on rolling_papers for update using (creator_id = auth.uid() or is_admin());
create policy rolling_papers_delete_admin_only on rolling_papers for delete using (is_admin());

create view rolling_papers_public as
  select id, creator_id, category_id, title, target_subject, description,
         visibility, allow_anonymous, deadline, is_deleted, created_at, updated_at
  from rolling_papers
  where not is_deleted or is_admin() or creator_id = auth.uid();

grant select on rolling_papers_public to anon, authenticated;

-- 롤링페이퍼 생성 (passkey는 여기서만 해시로 저장되고 평문은 즉시 폐기)
create function create_rolling_paper(
  p_title text, p_category_id uuid, p_target_subject text, p_description text,
  p_visibility text, p_passkey text, p_allow_anonymous boolean, p_deadline timestamptz
) returns rolling_papers_public
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id uuid;
  v_row rolling_papers_public;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;
  insert into rolling_papers (creator_id, category_id, title, target_subject, description, visibility, passkey_hash, allow_anonymous, deadline)
  values (
    auth.uid(), p_category_id, p_title, p_target_subject, p_description, p_visibility,
    case when p_visibility = 'passkey' then encode(digest(p_passkey, 'sha256'), 'hex') else null end,
    p_allow_anonymous, p_deadline
  )
  returning id into v_id;
  select * into v_row from rolling_papers_public where id = v_id;
  return v_row;
end;
$$;
grant execute on function create_rolling_paper(text, uuid, text, text, text, text, boolean, timestamptz) to authenticated;

-- 패스키 확인 (메시지 작성 폼을 보여줄지 판단하는 용도)
create function verify_rolling_paper_passkey(p_paper_id uuid, p_passkey text) returns boolean
language sql security definer set search_path = public, extensions as $$
  select exists (
    select 1 from rolling_papers
    where id = p_paper_id
      and visibility = 'passkey'
      and passkey_hash = encode(digest(p_passkey, 'sha256'), 'hex')
  );
$$;
grant execute on function verify_rolling_paper_passkey(uuid, text) to anon, authenticated;

-- 관리자가 패스키 없이 롤링페이퍼에 실제 접근 가능한지 여부(역할 기반) 확인용
create function can_access_rolling_paper(p_paper_id uuid) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select is_admin() or exists (
    select 1 from rolling_papers where id = p_paper_id and visibility = 'public'
  );
$$;
grant execute on function can_access_rolling_paper(uuid) to anon, authenticated;

-- ------------------------------------------------------------
-- 7. rolling_paper_messages
-- ------------------------------------------------------------
create table rolling_paper_messages (
  id uuid primary key default gen_random_uuid(),
  rolling_paper_id uuid not null references rolling_papers(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  is_anonymous boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table rolling_paper_messages enable row level security;
create policy messages_no_direct_select on rolling_paper_messages for select using (false);
create policy messages_update_own_or_admin on rolling_paper_messages for update using (author_id = auth.uid() or is_admin());
create policy messages_delete_admin_only on rolling_paper_messages for delete using (is_admin());
-- insert는 아래 post_rolling_paper_message() 함수를 통해서만 (passkey 검증 필요하므로 직접 insert 금지)
create policy messages_no_direct_insert on rolling_paper_messages for insert with check (false);

create view rolling_paper_messages_public as
  select m.id, m.rolling_paper_id,
         case when m.is_anonymous then null else m.author_id end as author_id,
         m.content, m.is_anonymous, m.is_deleted, m.created_at, m.updated_at
  from rolling_paper_messages m
  where not m.is_deleted or is_admin() or m.author_id = auth.uid();

grant select on rolling_paper_messages_public to anon, authenticated;

create function post_rolling_paper_message(
  p_paper_id uuid, p_content text, p_is_anonymous boolean, p_passkey text default null
) returns rolling_paper_messages_public
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_paper rolling_papers%rowtype;
  v_id uuid;
  v_row rolling_paper_messages_public;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;

  select * into v_paper from rolling_papers where id = p_paper_id and not is_deleted;
  if not found then
    raise exception '롤링페이퍼를 찾을 수 없습니다';
  end if;
  if v_paper.deadline is not null and now() > v_paper.deadline then
    raise exception '마감된 롤링페이퍼입니다';
  end if;
  if not v_paper.allow_anonymous and p_is_anonymous then
    raise exception '이 롤링페이퍼는 익명 작성을 허용하지 않습니다';
  end if;
  if v_paper.visibility = 'passkey' and not is_admin() then
    if p_passkey is null or encode(digest(p_passkey, 'sha256'), 'hex') <> v_paper.passkey_hash then
      raise exception '패스키가 올바르지 않습니다';
    end if;
  end if;

  insert into rolling_paper_messages (rolling_paper_id, author_id, content, is_anonymous)
  values (p_paper_id, auth.uid(), p_content, p_is_anonymous)
  returning id into v_id;

  select * into v_row from rolling_paper_messages_public where id = v_id;
  return v_row;
end;
$$;
grant execute on function post_rolling_paper_message(uuid, text, boolean, text) to authenticated;

-- ------------------------------------------------------------
-- 8. rolling_paper_reactions
-- ------------------------------------------------------------
create table rolling_paper_reactions (
  message_id uuid not null references rolling_paper_messages(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
alter table rolling_paper_reactions enable row level security;
create policy reactions_select_all on rolling_paper_reactions for select using (true);
create policy reactions_insert_own on rolling_paper_reactions for insert with check (auth.uid() = user_id);
create policy reactions_delete_own on rolling_paper_reactions for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 9. reports
-- ------------------------------------------------------------
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'rolling_paper', 'rolling_paper_message')),
  target_id uuid not null,
  reason text not null check (reason in ('abuse', 'defamation', 'sexual', 'privacy', 'spam', 'other')),
  detail text,
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

alter table reports enable row level security;
create policy reports_select_own_or_admin on reports for select using (reporter_id = auth.uid() or is_admin());
create policy reports_insert_own on reports for insert with check (auth.uid() is not null and reporter_id = auth.uid());
create policy reports_update_admin_only on reports for update using (is_admin());

-- ------------------------------------------------------------
-- 10. report_actions
-- ------------------------------------------------------------
create table report_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  admin_id uuid not null references profiles(id),
  action text not null check (action in ('delete_content', 'keep_content', 'dismiss', 'warn_user', 'restrict_user', 'deferred')),
  note text,
  created_at timestamptz not null default now()
);
alter table report_actions enable row level security;
create policy report_actions_admin_only on report_actions for all using (is_admin()) with check (is_admin());

-- ------------------------------------------------------------
-- 11. notices (공지사항)
-- ------------------------------------------------------------
create table notices (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id),
  title text not null,
  content text not null,
  is_pinned boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table notices enable row level security;
create policy notices_select_all on notices for select using (true);
create policy notices_admin_write on notices for all using (is_admin()) with check (is_admin());

-- ------------------------------------------------------------
-- 12. user_restrictions (경고/이용제한)
-- ------------------------------------------------------------
create table user_restrictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  admin_id uuid not null references profiles(id),
  type text not null check (type in ('warning', 'suspension')),
  reason text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table user_restrictions enable row level security;
create policy restrictions_select_own_or_admin on user_restrictions for select using (user_id = auth.uid() or is_admin());
create policy restrictions_admin_write on user_restrictions for insert with check (is_admin());

-- ------------------------------------------------------------
-- 13. admin_activity_logs
-- ------------------------------------------------------------
create table admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references profiles(id),
  action text not null,
  target_type text,
  target_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);
alter table admin_activity_logs enable row level security;
create policy admin_logs_admin_only on admin_activity_logs for all using (is_admin()) with check (is_admin());

-- ------------------------------------------------------------
-- 14. 롤링페이퍼 예약 삭제 (마감일이 지나면 매시간 자동으로 소프트 삭제)
-- ------------------------------------------------------------
create extension if not exists pg_cron with schema extensions;
select cron.schedule(
  'expire-rolling-papers',
  '0 * * * *',
  $cron$ update rolling_papers set is_deleted = true where deadline is not null and deadline < now() and not is_deleted; $cron$
);

-- ============================================================
-- 마지막 1회: 관리자 지정 (회원가입 후 아래를 직접 실행하세요)
-- update profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'lee66721711a@gmail.com');
-- ============================================================
