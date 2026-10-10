import { db } from '../db.js';
import { uploadPhoto, thumb } from '../image.js';
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
    (tasks.length ? tasks.map(t => `<button class="c" data-t="${t.id}"><div class="i">🧽</div><div class="t">${esc(t.title)}<small>${esc(t.detail || '')}</small></div>${pill(t.status)}</button>`).join('') : `<div class="empty">🎉 วันนี้ยังไม่มีงาน</div>`) +
    `<button class="b o" id="sw">เปลี่ยนคน</button></div>`;
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
    const t = tasks.find(x => x.id === b.dataset.t);
    if (['submitted', 'approved'].includes(t.status)) return toast('งานนี้ส่งแล้ว');
    detail(el, t);
  });
  el.querySelector('#sw').onclick = () => { localStorage.removeItem('workerId'); render(el); };
}

const slot = (kind, label, url) => `<label class="slot">${url ? `<img src="${esc(thumb(url))}" alt="${label}">` : '📷'}<span>${label}${url ? ' ✓' : ''}</span><input type="file" accept="image/*" capture="environment" hidden data-k="${kind}"></label>`;

function detail(el, t) {
  el.innerHTML = header(esc(t.title), esc(t.detail || 'ถ่ายรูปก่อนและหลังทำ แล้วส่งงาน')) +
    `<div class="g">${slot('before', 'รูปก่อนทำ', t.photo_before_url)}${slot('after', 'รูปหลังทำ', t.photo_after_url)}
    <button class="b" id="ok">ส่งงานเสร็จแล้ว</button><button class="b o" id="bk">กลับ</button></div>`;
  el.querySelectorAll('input[data-k]').forEach(i => i.onchange = async () => {
    const file = i.files[0]; if (!file) return;
    toast('กำลังอัปโหลดรูป…');
    try {
      const url = await uploadPhoto(db, t.id, i.dataset.k, file);
      const patch = { [i.dataset.k === 'before' ? 'photo_before_url' : 'photo_after_url']: url };
      if (t.status === 'todo' || t.status === 'rejected') patch.status = 'doing';
      const { error } = await db.from('tasks').update(patch).eq('id', t.id);
      if (error) throw error;
      Object.assign(t, patch); detail(el, t);
    } catch (e) { toast('อัปโหลดไม่สำเร็จ: ' + e.message); }
  });
  el.querySelector('#ok').onclick = async () => {
    if (!t.photo_before_url || !t.photo_after_url) return toast('ต้องมีรูปก่อนและหลังทำ');
    const { error } = await db.from('tasks').update({ status: 'submitted', submitted_at: new Date().toISOString() }).eq('id', t.id);
    toast(error ? error.message : 'ส่งงานแล้ว ✅'); render(el);
  };
  el.querySelector('#bk').onclick = () => render(el);
}
