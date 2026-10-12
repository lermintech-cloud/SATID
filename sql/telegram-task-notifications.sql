-- แจ้ง Telegram ทันทีเมื่อมอบหมายงาน และเมื่อส่งงานพร้อมรูปก่อน-หลัง
-- รันไฟล์นี้หนึ่งครั้งใน Supabase Dashboard > SQL Editor
-- ต้องรัน sql/secure.sql และตั้งค่า Telegram ในแอปให้เรียบร้อยก่อน

create or replace function public.telegram_task_notify(p_task_id uuid, p_kind text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  tok text; chat text; enabled text;
  task_title text; task_detail text; worker_name text; due_at timestamptz;
  before_url text; after_url text; msg text;
begin
  select value into enabled from settings where key = 'tg_enabled';
  select value into tok from settings where key = 'tg_token';
  select value into chat from settings where key = 'tg_chat_id';
  if coalesce(enabled, '0') <> '1' or coalesce(tok, '') = '' or coalesce(chat, '') = '' then return; end if;

  select t.title, t.detail, w.name, t.due_at, t.photo_before_url, t.photo_after_url
    into task_title, task_detail, worker_name, due_at, before_url, after_url
    from tasks t left join workers w on w.id = t.worker_id
    where t.id = p_task_id;
  if task_title is null then return; end if;

  if p_kind = 'created' then
    msg := '📌 มีงานพิเศษใหม่' || E'\n' ||
      'งาน: ' || task_title || E'\n' ||
      'ผู้รับผิดชอบ: ' || coalesce(worker_name, '-') ||
      case when coalesce(task_detail, '') <> '' then E'\nรายละเอียด: ' || left(task_detail, 500) else '' end ||
      case when due_at is not null then E'\nกำหนด: ' || to_char(due_at at time zone 'Asia/Bangkok', 'DD/MM/YYYY HH24:MI') else '' end;
    perform net.http_post(
      url := 'https://api.telegram.org/bot' || tok || '/sendMessage',
      body := jsonb_build_object('chat_id', chat, 'text', msg),
      headers := '{"Content-Type": "application/json"}'::jsonb);
    return;
  end if;

  msg := '✅ ส่งงานแล้ว' || E'\n' ||
    'งาน: ' || task_title || E'\n' ||
    'ผู้รับผิดชอบ: ' || coalesce(worker_name, '-') ||
    case when coalesce(task_detail, '') <> '' then E'\nรายละเอียด: ' || left(task_detail, 500) else '' end;

  if coalesce(before_url, '') <> '' and coalesce(after_url, '') <> '' then
    perform net.http_post(
      url := 'https://api.telegram.org/bot' || tok || '/sendMediaGroup',
      body := jsonb_build_object('chat_id', chat, 'media', jsonb_build_array(
        jsonb_build_object('type', 'photo', 'media', before_url, 'caption', msg || E'\n\n📷 ก่อนทำ'),
        jsonb_build_object('type', 'photo', 'media', after_url, 'caption', '📷 หลังทำ'))),
      headers := '{"Content-Type": "application/json"}'::jsonb);
  elsif coalesce(after_url, before_url, '') <> '' then
    perform net.http_post(
      url := 'https://api.telegram.org/bot' || tok || '/sendPhoto',
      body := jsonb_build_object('chat_id', chat, 'photo', coalesce(after_url, before_url), 'caption', msg),
      headers := '{"Content-Type": "application/json"}'::jsonb);
  else
    perform net.http_post(
      url := 'https://api.telegram.org/bot' || tok || '/sendMessage',
      body := jsonb_build_object('chat_id', chat, 'text', msg),
      headers := '{"Content-Type": "application/json"}'::jsonb);
  end if;
end;
$$;

create or replace function public.on_task_telegram_notify()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  if tg_op = 'INSERT' then
    perform public.telegram_task_notify(new.id, 'created');
  elsif new.status in ('submitted', 'approved') and old.status not in ('submitted', 'approved') then
    perform public.telegram_task_notify(new.id, 'submitted');
  end if;
  return new;
exception when others then
  -- การแจ้งเตือนผิดพลาดต้องไม่ขัดขวางการมอบหมายหรือส่งงาน
  raise warning 'Telegram task notification failed: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists task_telegram_notify on public.tasks;
create trigger task_telegram_notify
after insert or update of status on public.tasks
for each row execute function public.on_task_telegram_notify();
