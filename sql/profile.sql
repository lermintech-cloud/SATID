-- โปรไฟล์/ข้อมูลติดต่อนักการภารโรง: รันทีละคำสั่งใน Supabase SQL Editor
alter table workers add column phone text, add column line_id text, add column note text, add column photo_url text;
create policy "workers update" on workers for update using (true) with check (true);
-- เตือน: policy นี้ให้ทุกคนที่มีลิงก์แก้ข้อมูลภารโรงได้ จนกว่าจะเพิ่ม PIN
