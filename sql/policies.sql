-- รันหลัง schema (ตาราง workers/tasks/issues) ทีละบล็อกใน Supabase SQL Editor
alter table tasks enable row level security;
drop policy if exists "tasks open" on tasks;
create policy "tasks open" on tasks for all using (true) with check (true);
-- เตือน: policy นี้ให้ทุกคนที่เปิดเว็บอ่าน/เขียนงานได้ (ยังไม่มี PIN) ใช้ช่วงทดลองเท่านั้น
-- ขั้นต่อไป: เพิ่ม PIN/Auth แล้วจำกัดสิทธิ์ตามบทบาท
