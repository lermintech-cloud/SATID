import { db } from '../db.js';
import { esc, toast, header } from '../ui.js';
import { ic } from '../icons.js';
const SAMPLES = ['เปิดประตูโรงเรียน', 'กวาดลานหน้าเสาธง', 'ทำความสะอาดห้องน้ำ', 'เก็บขยะทั่วบริเวณ', 'รดน้ำต้นไม้', 'เช็ดถูทางเดินอาคารเรียน', 'ตรวจก๊อกน้ำและไฟฟ้า', 'เติมสบู่และกระดาษชำระ', 'เปิด-ปิดไฟส่วนกลาง', 'ปิดไฟ ล็อกประตูห้อง'];
let editing = false;
const ymd = () => new Date().toLocaleDateString('sv-SE');

export function render(el) { editing = false; draw(el); }

async function draw(el) {
  const d = ymd();
  const [a, b] = await Promise.all([
    db.from('routines').select('*').eq('active', true).order('sort').order('created_at'),
    db.from('routine_logs').select('routine_id').eq('log_date', d)]);
  const head = header('งานวันนี้', new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' }));
  if (a.error) return el.innerHTML = head + `<div class="g"><div class="c" style="display:block"><b>ยังใช้งานไม่ได้</b><br><small>${esc(a.error.message)}</small><br><small>ตรวจว่ารัน sql/routines.sql ใน Supabase ครบทุกคำสั่งแล้ว</small></div></div>`;
  const rt = a.data, dn = new Set((b.data ?? []).map(l => l.routine_id)), n = rt.filter(r => dn.has(r.id)).length;
  const again = (error, m) => { toast(error ? error.message : m); draw(el); };
  el.innerHTML = head + `<div class="g"><div class="c" style="display:block"><b>ทำแล้ว ${n} จาก ${rt.length} รายการ</b><div class="bar"><i style="width:${rt.length ? Math.round(n / rt.length * 100) : 0}%"></i></div></div>` +
    rt.map(r => `<div class="c"><div class="t">${esc(r.title)}</div>` + (editing
      ? `<button class="p" data-ed="${r.id}">${ic('pen', 16)} แก้</button><button class="p er" data-rm="${r.id}">${ic('trash', 16)} ลบ</button>`
      : `<button class="dn ${dn.has(r.id) ? 'y' : ''}" data-rt="${r.id}">${dn.has(r.id) ? ic('check', 18) + ' ' : ''}ดำเนินการแล้ว</button>`) + `</div>`).join('') +
    (rt.length || editing ? '' : `<div class="empty">ยังไม่มีรายการ กด “แก้ไขรายการ” เพื่อเพิ่ม</div>`) +
    (editing ? `<form id="rf" class="rowf"><input class="in" name="title" placeholder="เพิ่มรายการงานประจำ" required><button class="p on" style="min-height:52px;padding:0 18px">${ic('plus', 16)} เพิ่ม</button></form><button class="b o" id="sm">เพิ่มตัวอย่าง 10 รายการ</button>` : '') +
    `<button class="b ${editing ? '' : 'o'}" id="tg">${editing ? 'เสร็จสิ้นการแก้ไข' : 'แก้ไขรายการ'}</button></div>`;
  el.querySelector('#tg').onclick = () => { editing = !editing; draw(el); };
  el.querySelectorAll('[data-rt]').forEach(x => x.onclick = async () => {
    const rid = x.dataset.rt;
    again((await (dn.has(rid) ? db.from('routine_logs').delete().eq('routine_id', rid).eq('log_date', d) : db.from('routine_logs').insert({ routine_id: rid, log_date: d }))).error, 'บันทึกแล้ว');
  });
  if (!editing) return;
  el.querySelector('#rf').onsubmit = async e => { e.preventDefault(); again((await db.from('routines').insert({ title: new FormData(e.target).get('title').trim(), sort: rt.length + 1 })).error, 'เพิ่มรายการแล้ว'); };
  el.querySelector('#sm').onclick = async () => {
    const have = new Set(rt.map(r => r.title)), rows = SAMPLES.filter(t => !have.has(t)).map((title, i) => ({ title, sort: rt.length + i + 1 }));
    rows.length ? again((await db.from('routines').insert(rows)).error, `เพิ่มตัวอย่าง ${rows.length} รายการ`) : toast('มีตัวอย่างครบแล้ว');
  };
  el.querySelectorAll('[data-ed]').forEach(x => x.onclick = async () => {
    const r = rt.find(y => y.id === x.dataset.ed), v = prompt('แก้ชื่อรายการ', r.title)?.trim();
    if (v) again((await db.from('routines').update({ title: v }).eq('id', r.id)).error, 'แก้ไขแล้ว');
  });
  el.querySelectorAll('[data-rm]').forEach(x => x.onclick = async () => {
    if (confirm('ลบรายการนี้ออกจากงานประจำ?')) again((await db.from('routines').update({ active: false }).eq('id', x.dataset.rm)).error, 'ลบแล้ว');
  });
}
