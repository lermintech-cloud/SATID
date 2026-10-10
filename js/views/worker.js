import { db } from '../db.js';
import { esc, pill, toast, header } from '../ui.js';

export async function render(el) {
  const id = localStorage.getItem('workerId');
  if (!id) {
    const { data = [] } = await db.from('workers').select('*').eq('active', true);
    el.innerHTML = header('คุณคือใคร?', 'แตะชื่อของคุณ') + `<div class="g">${data.map(w => `<button class="c" data-w="${w.id}"><div class="i">🧹</div><div class="t">${esc(w.name)}<small>${esc(w.area)}</small></div></button>`).join('')}</div>`;
    el.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { localStorage.setItem('workerId', b.dataset.w); render(el); });
    return;
  }
  const { data: tasks, error } = await db.from('tasks').select('*').eq('worker_id', id).order('due_at');
  if (error) return el.innerHTML = header('ผิดพลาด', esc(error.message));
  const done = tasks.filter(t => ['submitted', 'approved'].includes(t.status)).length;
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  el.innerHTML = header('งานของฉัน', `เสร็จแล้ว ${done} จาก ${tasks.length} งาน`) +
    `<div class="g"><div class="bar"><i style="width:${pct}%"></i></div>` +
    (tasks.length ? tasks.map(t => `<button class="c" data-t="${t.id}" data-s="${t.status}"><div class="i">🧽</div><div class="t">${esc(t.title)}<small>${esc(t.detail || '')}</small></div>${pill(t.status)}</button>`).join('') : `<div class="empty">🎉 วันนี้ยังไม่มีงาน</div>`) +
    `<button class="b o" id="sw">เปลี่ยนคน</button></div>`;
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = async () => {
    const s = b.dataset.s; if (s === 'submitted' || s === 'approved') return;
    const next = s === 'doing' ? 'submitted' : 'doing';
    const patch = { status: next, ...(next === 'submitted' && { submitted_at: new Date().toISOString() }) };
    const { error } = await db.from('tasks').update(patch).eq('id', b.dataset.t);
    toast(error ? error.message : next === 'submitted' ? 'ส่งงานแล้ว ✅' : 'เริ่มงานแล้ว');
    render(el);
  });
  el.querySelector('#sw').onclick = () => { localStorage.removeItem('workerId'); render(el); };
}
