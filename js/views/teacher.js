import { db } from '../db.js';
import { esc, pill, toast, header } from '../ui.js';
import { ic } from '../icons.js';
const link = (u, l) => u ? ` · <a href="${esc(u)}" target="_blank" rel="noopener" style="color:var(--pri)">${l}</a>` : '';

export async function render(el) {
  const [{ data: ws = [] }, { data: ts, error }] = await Promise.all([
    db.from('workers').select('id,name').eq('active', true),
    db.from('tasks').select('*,workers(name)').order('created_at', { ascending: false }).limit(30)]);
  if (error) return el.innerHTML = header('ผิดพลาด', esc(error.message));
  el.innerHTML = header('ครู', 'มอบหมายและตรวจรับงาน') + `<div class="g">
    <form id="f" class="f"><input class="in" name="title" placeholder="ชื่องาน" required>
    <select class="in" name="worker_id" required>${ws.map(w => `<option value="${w.id}">${esc(w.name)}</option>`).join('')}</select>
    <input class="in" type="datetime-local" name="due_at"><button class="b">มอบหมายงาน</button></form>` +
    ts.map(t => `<div class="c"><div class="i">${ic('task')}</div><div class="t">${esc(t.title)}<small>${esc(t.workers?.name || '')}${link(t.photo_before_url, 'ก่อน')}${link(t.photo_after_url, 'หลัง')}</small></div>` +
      (t.status === 'submitted' ? `<button class="p ok" data-a="approved" data-id="${t.id}">อนุมัติ</button><button class="p er" data-a="rejected" data-id="${t.id}">ตีกลับ</button>` : pill(t.status)) + `</div>`).join('') + `</div>`;
  const done = (error, m) => { toast(error ? error.message : m); render(el); };
  el.querySelector('#f').onsubmit = async e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    f.due_at ? f.due_at = new Date(f.due_at).toISOString() : delete f.due_at;
    done((await db.from('tasks').insert(f)).error, 'มอบหมายงานแล้ว');
  };
  el.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => done((await db.from('tasks').update({ status: b.dataset.a }).eq('id', b.dataset.id)).error, 'บันทึกแล้ว'));
}
