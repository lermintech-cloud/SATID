import { db } from '../db.js';
import { esc, pill, toast, header } from '../ui.js';
const link = (u, l) => u ? ` · <a href="${esc(u)}" target="_blank" rel="noopener" style="color:var(--pri)">${l}</a>` : '';

export async function render(el) {
  const [{ data: ws = [] }, { data: ts, error }, r3] = await Promise.all([
    db.from('workers').select('id,name').eq('active', true),
    db.from('tasks').select('*,workers(name)').order('created_at', { ascending: false }).limit(30),
    db.from('routines').select('*').eq('active', true).order('sort').order('created_at')]);
  if (error) return el.innerHTML = header('ผิดพลาด', esc(error.message));
  const rt = r3.data ?? [];
  el.innerHTML = header('ครู', 'มอบหมายและตรวจรับงาน') + `<div class="g">
    <form id="f" class="f"><input class="in" name="title" placeholder="ชื่องาน" required>
    <select class="in" name="worker_id" required>${ws.map(w => `<option value="${w.id}">${esc(w.name)}</option>`).join('')}</select>
    <input class="in" type="datetime-local" name="due_at"><button class="b">มอบหมายงาน</button></form>` +
    ts.map(t => `<div class="c"><div class="i">📝</div><div class="t">${esc(t.title)}<small>${esc(t.workers?.name || '')}${link(t.photo_before_url, 'ก่อน')}${link(t.photo_after_url, 'หลัง')}</small></div>` +
      (t.status === 'submitted' ? `<button class="p ok" data-a="approved" data-id="${t.id}">อนุมัติ</button><button class="p er" data-a="rejected" data-id="${t.id}">ตีกลับ</button>` : pill(t.status)) + `</div>`).join('') +
    `<p class="sec">จัดการงานประจำวัน (${rt.length} รายการ)</p>
    <form id="rf" style="display:flex;gap:8px"><input class="in" name="title" placeholder="เพิ่มรายการงานประจำ" required><button class="p on" style="min-height:52px;padding:0 18px">เพิ่ม</button></form>` +
    rt.map(r => `<div class="c"><div class="t">${esc(r.title)}</div><button class="p" data-ed="${r.id}">✏️ แก้</button><button class="p er" data-rm="${r.id}">🗑️ ลบ</button></div>`).join('') + `</div>`;
  const done = (error, m) => { toast(error ? error.message : m); render(el); };
  el.querySelector('#f').onsubmit = async e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    f.due_at ? f.due_at = new Date(f.due_at).toISOString() : delete f.due_at;
    done((await db.from('tasks').insert(f)).error, 'มอบหมายงานแล้ว ✅');
  };
  el.querySelector('#rf').onsubmit = async e => {
    e.preventDefault(); const title = new FormData(e.target).get('title').trim();
    done((await db.from('routines').insert({ title, sort: rt.length + 1 })).error, 'เพิ่มรายการแล้ว');
  };
  el.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => done((await db.from('tasks').update({ status: b.dataset.a }).eq('id', b.dataset.id)).error, 'บันทึกแล้ว'));
  el.querySelectorAll('[data-ed]').forEach(b => b.onclick = async () => {
    const r = rt.find(x => x.id === b.dataset.ed), v = prompt('แก้ชื่อรายการ', r.title)?.trim();
    if (v) done((await db.from('routines').update({ title: v }).eq('id', r.id)).error, 'แก้ไขแล้ว');
  });
  el.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => {
    if (confirm('ลบรายการนี้ออกจากงานประจำ?')) done((await db.from('routines').update({ active: false }).eq('id', b.dataset.rm)).error, 'ลบแล้ว');
  });
}
