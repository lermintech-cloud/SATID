import { db } from '../db.js';
import { uploadPhoto, thumb } from '../image.js';
import { esc, pill, toast, header, busy } from '../ui.js';
const today = () => new Date().toLocaleDateString('sv-SE');

export async function render(el) {
  let id = localStorage.getItem('workerId');
  if (!id) {
    const { data = [] } = await db.from('workers').select('*').eq('active', true);
    if (data.length === 1) { id = data[0].id; localStorage.setItem('workerId', id); }
    else {
      el.innerHTML = header('คุณคือใคร?', 'แตะชื่อของคุณ') + `<div class="g">${data.map(w => `<button class="c" data-w="${w.id}"><div class="i">🧹</div><div class="t">${esc(w.name)}<small>${esc(w.area)}</small></div></button>`).join('')}</div>`;
      el.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { localStorage.setItem('workerId', b.dataset.w); render(el); });
      return;
    }
  }
  const d = today();
  const [r1, r2, r3] = await Promise.all([
    db.from('tasks').select('*').eq('worker_id', id).order('due_at'),
    db.from('routines').select('*').eq('active', true).order('sort').order('created_at'),
    db.from('routine_logs').select('routine_id').eq('log_date', d)]);
  if (r1.error) return el.innerHTML = header('ผิดพลาด', esc(r1.error.message));
  const tasks = r1.data, rt = r2.data ?? [], dn = new Set((r3.data ?? []).map(l => l.routine_id));
  const rdone = rt.filter(r => dn.has(r.id)).length;
  const done = tasks.filter(t => ['submitted', 'approved'].includes(t.status)).length;
  el.innerHTML = header('งานของฉัน', `งานที่มอบหมาย ${done}/${tasks.length} · งานประจำ ${rdone}/${rt.length}`) + `<div class="g">` +
    (rt.length ? `<p class="sec">งานประจำวันนี้ <span class="p ${rdone === rt.length ? 'ok' : ''}">${rdone}/${rt.length}</span></p>` +
      rt.map(r => `<button class="c" data-rt="${r.id}"><div class="ck ${dn.has(r.id) ? 'y' : ''}">${dn.has(r.id) ? '✓' : ''}</div><div class="t">${esc(r.title)}</div></button>`).join('') : '') +
    `<p class="sec">งานที่ได้รับมอบหมาย</p>` +
    (tasks.length ? tasks.map(t => `<button class="c" data-t="${t.id}"><div class="i">🧽</div><div class="t">${esc(t.title)}<small>${esc(t.detail || '')}</small></div>${pill(t.status)}</button>`).join('') : `<div class="empty">🎉 ยังไม่มีงานมอบหมาย</div>`) + `</div>`;
  el.querySelectorAll('[data-rt]').forEach(b => b.onclick = async () => {
    const rid = b.dataset.rt;
    const { error } = await (dn.has(rid) ? db.from('routine_logs').delete().eq('routine_id', rid).eq('log_date', d) : db.from('routine_logs').insert({ routine_id: rid, log_date: d }));
    if (error) toast(error.message); render(el);
  });
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
    const t = tasks.find(x => x.id === b.dataset.t);
    if (['submitted', 'approved'].includes(t.status)) return toast('งานนี้ส่งแล้ว');
    detail(el, t);
  });
}

const slot = (k, label, url) => `<div class="slot"><div class="pv">${url ? `<img src="${esc(thumb(url))}" alt="${label}">` : '📷'}</div><b>${label}${url ? ' ✓' : ''}</b><div class="row">
  <label class="p on">📷 ถ่ายรูป<input type="file" accept="image/*" capture="environment" hidden data-k="${k}"></label>
  <label class="p">🖼️ เลือกจากเครื่อง<input type="file" accept="image/*" hidden data-k="${k}"></label></div></div>`;

function detail(el, t) {
  el.innerHTML = header(esc(t.title), esc(t.detail || 'ถ่ายหรือเลือกรูปก่อนและหลังทำ แล้วส่งงาน')) +
    `<div class="g">${slot('before', 'รูปก่อนทำ', t.photo_before_url)}${slot('after', 'รูปหลังทำ', t.photo_after_url)}
    <button class="b" id="ok">ส่งงานเสร็จแล้ว</button><button class="b o" id="bk">กลับ</button></div>`;
  el.querySelectorAll('input[data-k]').forEach(i => i.onchange = async () => {
    const file = i.files[0]; if (!file) return;
    const ov = busy('กำลังเตรียมรูป…'); let ok = false;
    try {
      const url = await uploadPhoto(db, t.id, i.dataset.k, file, m => ov.set(m));
      ov.set('กำลังบันทึก…');
      const patch = { [i.dataset.k === 'before' ? 'photo_before_url' : 'photo_after_url']: url };
      if (t.status === 'todo' || t.status === 'rejected') patch.status = 'doing';
      const { error } = await db.from('tasks').update(patch).eq('id', t.id);
      if (error) throw error;
      Object.assign(t, patch); ok = true; ov.set('เสร็จแล้ว ✅'); await new Promise(r => setTimeout(r, 600));
    } catch (e) { toast('อัปโหลดไม่สำเร็จ: ' + e.message); }
    finally { ov.done(); }
    if (ok) detail(el, t);
  });
  el.querySelector('#ok').onclick = async () => {
    if (!t.photo_before_url || !t.photo_after_url) return toast('ต้องมีรูปก่อนและหลังทำ');
    const { error } = await db.from('tasks').update({ status: 'submitted', submitted_at: new Date().toISOString() }).eq('id', t.id);
    toast(error ? error.message : 'ส่งงานแล้ว ✅'); render(el);
  };
  el.querySelector('#bk').onclick = () => render(el);
}
