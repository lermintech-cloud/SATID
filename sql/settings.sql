-- ตารางการตั้งค่าระบบ: รันทีละคำสั่งใน Supabase SQL Editor
create table settings (key text primary key, value text, updated_at timestamptz default now());
alter table settings enable row level security;
create policy "settings open" on settings for all using (true) with check (true);
-- เตือน: ใครมีลิงก์ก็อ่าน/แก้การตั้งค่าได้ อย่าเก็บรหัสลับ (เช่น โทเคนบอท) ในตารางนี้
