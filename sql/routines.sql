-- งานประจำวัน: รันทีละบล็อกใน Supabase SQL Editor
create table routines (id uuid primary key default gen_random_uuid(), title text not null, sort int default 0, active boolean default true, created_at timestamptz default now());
create table routine_logs (id uuid primary key default gen_random_uuid(), routine_id uuid references routines(id) on delete cascade, log_date date not null, created_at timestamptz default now(), unique (routine_id, log_date));
alter table routines enable row level security;
alter table routine_logs enable row level security;
create policy "routines open" on routines for all using (true) with check (true);
create policy "routine_logs open" on routine_logs for all using (true) with check (true);
insert into routines (title, sort) values ('เปิดประตูโรงเรียน',1),('กวาดลานหน้าเสาธง',2),('ทำความสะอาดห้องน้ำ',3),('เก็บขยะทั่วบริเวณ',4),('ปิดไฟ ล็อกประตูห้อง',5);
-- เตือน: policy เปิดให้ทุกคนที่มีลิงก์อ่าน/เขียนได้ จนกว่าจะเพิ่ม PIN
