-- ===== บล็อก 1: ส่วนขยาย (ถ้า error ให้เปิด pg_net และ pg_cron ที่ Dashboard > Database > Extensions แทน) =====
create extension if not exists pg_net;
create extension if not exists pg_cron;
-- ===== บล็อก 2: ตารางและล็อกสิทธิ์ (ทีละคำสั่ง) =====
create table if not exists settings (key text primary key, value text, updated_at timestamptz default now());
create table if not exists pin_attempts (id bigserial primary key, at timestamptz default now());
alter table settings enable row level security;
alter table pin_attempts enable row level security;
drop policy if exists "settings open" on settings;
-- ===== บล็อก 3: ฟังก์ชัน PIN (ทีละฟังก์ชัน) =====
create or replace function public._pin_ok(p text) returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare h text; fails int;
begin
  select value into h from settings where key = 'pin_hash';
  if h is null then return false; end if;
  select count(*) into fails from pin_attempts where at > now() - interval '10 minutes';
  if fails >= 5 then raise exception 'ใส่ PIN ผิดหลายครั้ง กรุณารอ 10 นาที'; end if;
  if p is not null and h = crypt(p, h) then delete from pin_attempts; return true; end if;
  insert into pin_attempts default values;
  return false;
end $$;

create or replace function public.pin_status() returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object('set', exists (select 1 from settings where key = 'pin_hash'));
$$;

create or replace function public.pin_set(new_pin text, old_pin text default null) returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare h text;
begin
  if new_pin !~ '^[0-9]{4,8}$' then raise exception 'PIN ต้องเป็นตัวเลข 4-8 หลัก'; end if;
  select value into h from settings where key = 'pin_hash';
  if h is not null and not public._pin_ok(old_pin) then return false; end if;
  insert into settings (key, value) values ('pin_hash', crypt(new_pin, gen_salt('bf'))) on conflict (key) do update set value = excluded.value;
  return true;
end $$;
-- ===== บล็อก 4: ฟังก์ชันการตั้งค่า (ทีละฟังก์ชัน) =====
create or replace function public.settings_get(p text) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare j jsonb;
begin
  if not public._pin_ok(p) then raise exception 'PIN ไม่ถูกต้อง'; end if;
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into j from settings where key in ('tg_enabled', 'tg_chat_id', 'tg_time1', 'tg_time2', 'tg_pending', 'tg_routine');
  return j || jsonb_build_object('tg_token_set', exists (select 1 from settings where key = 'tg_token' and coalesce(value, '') <> ''));
end $$;

create or replace function public.settings_save(p text, vals jsonb) returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare k text;
begin
  if not public._pin_ok(p) then raise exception 'PIN ไม่ถูกต้อง'; end if;
  foreach k in array array['tg_enabled', 'tg_chat_id', 'tg_token', 'tg_time1', 'tg_time2', 'tg_pending', 'tg_routine'] loop
    if jsonb_exists(vals, k) and not (k = 'tg_token' and coalesce(vals->>k, '') = '') then
      insert into settings (key, value) values (k, vals->>k) on conflict (key) do update set value = excluded.value;
    end if;
  end loop;
  return true;
end $$;
-- ===== บล็อก 5: ส่ง Telegram (ทีละฟังก์ชัน) =====
create or replace function public.send_reminders(force boolean default false) returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  tok text; chat text; en text; pend text; rout text; slot text; tm text; lastd date; hit boolean := false;
  nowbk timestamp := now() at time zone 'Asia/Bangkok';
  today date := (now() at time zone 'Asia/Bangkok')::date;
  msg text; n int; lst text; dn int; tot int;
begin
  select value into en from settings where key = 'tg_enabled';
  select value into tok from settings where key = 'tg_token';
  select value into chat from settings where key = 'tg_chat_id';
  select value into pend from settings where key = 'tg_pending';
  select value into rout from settings where key = 'tg_routine';
  if not force then
    if coalesce(en, '0') <> '1' then return; end if;
    foreach slot in array array['tg_time1', 'tg_time2'] loop
      select value into tm from settings where key = slot;
      tm := coalesce(nullif(tm, ''), case when slot = 'tg_time1' then '07:30' else '15:30' end);
      select value::date into lastd from settings where key = 'last_' || slot;
      if lastd is distinct from today and nowbk >= today + tm::time and nowbk < today + tm::time + interval '3 hours' then
        hit := true;
        insert into settings (key, value) values ('last_' || slot, today::text) on conflict (key) do update set value = excluded.value;
      end if;
    end loop;
    if not hit then return; end if;
  end if;
  if coalesce(tok, '') = '' or coalesce(chat, '') = '' then return; end if;
  msg := '📋 สรุปงาน โรงเรียนบ้านไร่' || E'\n' || to_char(nowbk, 'DD/MM/YYYY HH24:MI');
  if coalesce(pend, '1') = '1' then
    select count(*) into n from tasks where status in ('todo', 'doing', 'rejected');
    if n = 0 then
      msg := msg || E'\n\n🔸 ไม่มีงานค้าง';
    else
      select string_agg('• ' || x.title || coalesce(' (' || x.name || ')', '') || case when x.due_at < now() then ' ⚠️เกินกำหนด' else '' end, E'\n') into lst
        from (select t.title, w.name, t.due_at from tasks t left join workers w on w.id = t.worker_id where t.status in ('todo', 'doing', 'rejected') order by t.due_at nulls last limit 12) x;
      msg := msg || E'\n\n🔸 งานค้าง ' || n || ' งาน' || E'\n' || lst;
      if n > 12 then msg := msg || E'\n… และอีก ' || (n - 12) || ' งาน'; end if;
    end if;
  end if;
  if coalesce(rout, '1') = '1' then
    select count(*) into tot from routines where active;
    select count(*) into dn from routines q where q.active and exists (select 1 from routine_logs l where l.routine_id = q.id and l.log_date = today);
    msg := msg || E'\n\n✅ งานประจำวันนี้ ' || dn || '/' || tot;
    select string_agg('• ' || y.title, E'\n') into lst
      from (select q.title from routines q where q.active and not exists (select 1 from routine_logs l where l.routine_id = q.id and l.log_date = today) order by q.sort limit 12) y;
    if lst is not null then msg := msg || E'\nยังไม่ทำ:' || E'\n' || lst; end if;
  end if;
  perform net.http_post(url := 'https://api.telegram.org/bot' || tok || '/sendMessage', body := jsonb_build_object('chat_id', chat, 'text', msg), headers := '{"Content-Type": "application/json"}'::jsonb);
end $$;

create or replace function public.telegram_test(p text) returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare tok text; chat text; rid bigint;
begin
  if not public._pin_ok(p) then raise exception 'PIN ไม่ถูกต้อง'; end if;
  select value into tok from settings where key = 'tg_token';
  select value into chat from settings where key = 'tg_chat_id';
  if coalesce(tok, '') = '' or coalesce(chat, '') = '' then raise exception 'ยังไม่ได้ตั้งค่า Bot token หรือ Chat ID (กดบันทึกก่อน)'; end if;
  select net.http_post(url := 'https://api.telegram.org/bot' || tok || '/sendMessage', body := jsonb_build_object('chat_id', chat, 'text', '✅ ทดสอบการแจ้งเตือนจากระบบนักการภารโรง โรงเรียนบ้านไร่'), headers := '{"Content-Type": "application/json"}'::jsonb) into rid;
  return rid;
end $$;

create or replace function public.telegram_result(p text, rid bigint) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s int; b text;
begin
  if not public._pin_ok(p) then raise exception 'PIN ไม่ถูกต้อง'; end if;
  select status_code, content::text into s, b from net._http_response where id = rid;
  return jsonb_build_object('status', s, 'body', left(coalesce(b, ''), 300));
end $$;

create or replace function public.reminders_now(p text) returns boolean language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public._pin_ok(p) then raise exception 'PIN ไม่ถูกต้อง'; end if;
  perform public.send_reminders(true);
  return true;
end $$;
-- ===== บล็อก 6: ปิดสิทธิ์ฟังก์ชันภายใน และตั้งเวลา =====
revoke all on function public._pin_ok(text) from public, anon, authenticated;
revoke all on function public.send_reminders(boolean) from public, anon, authenticated;
select cron.schedule('banrai-reminders', '*/15 * * * *', 'select public.send_reminders()');
