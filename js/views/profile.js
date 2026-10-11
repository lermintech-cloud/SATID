import { db } from '../db.js';
import { uploadPhoto } from '../image.js';
import { esc, toast, header, busy } from '../ui.js';
import { ic } from '../icons.js';
import { me, loadMe, paintMe } from '../me.js';
let editing = false;
export function render(el) { editing = false; draw(el); }

async function draw(el) {
  if (!me.id) await loadMe();
  const head = header('โปรไฟล์ของฉัน', 'ข้อมูลติดต่อนักการภารโรง');
  if (!me.id) return el.innerHTML = head + `<div class="g"><div class="empty">ยังไม่ทราบว่าคุณคือใคร เปิดหน้า “ภารโรง” แล้วแตะชื่อก่อน</div></div>`;
  const { data: w, error } = await db.from('workers').select('*').eq('id', me.id).single();
  if (error) return el.innerHTML = head + `<div class="g"><div class="c" style="display:block"><b>โหลดไม่สำเร็จ</b><br><small>${esc(error.message)}</small></div></div>`;
  const ready = 'phone' in w;
  const row = (i, l, v) => v ? `<div class="c"><div class="i">${ic(i, 20)}</div><div class="t">${esc(v)}<small>${l}</small></div>${i === 'phone' ? `<a class="p on" href="tel:${esc(v)}">โทร</a>` : ''}</div>` : '';
  const f = (n, p, v, t = 'text') => `<input class="in" name="${n}" type="${t}" value="${esc(v || '')}" placeholder="${p}">`;
  el.innerHTML = head + `<div class="g pf"><div class="big">${w.photo_url ? `<img src="${esc(w.photo_url)}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` : ic('user', 48)}</div>
    <div><b style="font-size:20px">${esc(w.name)}</b><br><small style="color:var(--mut)">นักการภารโรง</small></div>
    <div class="row"><label class="p on">${ic('camera', 16)} ถ่ายรูป<input type="file" accept="image/*" capture="user" hidden></label><label class="p">${ic('image', 16)} เลือกจากเครื่อง<input type="file" accept="image/*" hidden></label></div>` +
    (ready ? '' : `<div class="c" style="display:block;text-align:left"><b>ยังเพิ่มช่องข้อมูลไม่ครบ</b><br><small>รัน sql/profile.sql ใน Supabase ก่อน จึงจะบันทึกข้อมูลติดต่อได้</small></div>`) +
    (editing ? `<form id="pf" class="f">${f('name', 'ชื่อ-สกุล', w.name)}${f('phone', 'เบอร์โทร', w.phone, 'tel')}${f('line_id', 'LINE ID', w.line_id)}${f('area', 'พื้นที่ที่ดูแล', w.area)}${f('note', 'หมายเหตุ เช่น เวลาทำงาน', w.note)}<button class="b">บันทึก</button><button type="button" class="b o" id="cx">ยกเลิก</button></form>`
      : (row('phone', 'เบอร์โทร', w.phone) + row('chat', 'LINE ID', w.line_id) + row('pin', 'พื้นที่ที่ดูแล', w.area) + row('task', 'หมายเหตุ', w.note) +
        (w.phone || w.line_id || w.note ? '' : `<div class="empty">ยังไม่มีข้อมูลติดต่อ กดปุ่มด้านล่างเพื่อเพิ่ม</div>`) + `<button class="b" id="ed">แก้ไขข้อมูล</button>`)) + `</div>`;
  el.querySelectorAll('input[type=file]').forEach(i => i.onchange = async () => {
    const file = i.files[0]; if (!file) return;
    const ov = busy('กำลังเตรียมรูป…');
    try {
      const url = await uploadPhoto(db, `profiles/${me.id}`, 'photo', file, m => ov.set(m), [512, 160]);
      const { error } = await db.from('workers').update({ photo_url: url }).eq('id', me.id);
      if (error) throw error;
      me.photo = url; paintMe(); ov.set('เสร็จแล้ว'); await new Promise(r => setTimeout(r, 500));
    } catch (e) { toast('อัปโหลดไม่สำเร็จ: ' + e.message); } finally { ov.done(); }
    draw(el);
  });
  el.querySelector('#ed')?.addEventListener('click', () => { editing = true; draw(el); });
  el.querySelector('#cx')?.addEventListener('click', () => { editing = false; draw(el); });
  el.querySelector('#pf')?.addEventListener('submit', async e => {
    e.preventDefault(); const p = Object.fromEntries([...new FormData(e.target)].map(([k, v]) => [k, v.trim()]));
    const { error } = await db.from('workers').update(p).eq('id', me.id);
    if (error) return toast(error.message);
    me.name = p.name; editing = false; toast('บันทึกแล้ว'); draw(el);
  });
}
