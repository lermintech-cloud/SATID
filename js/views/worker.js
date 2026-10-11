import { db } from '../db.js';
import { prepPhoto, sendPhoto, thumb } from '../image.js';
import { esc, pill, toast, header, busy } from '../ui.js';
import { ic } from '../icons.js';
import { add, flush, isNet, cget, cset, patchTask } from '../queue.js';
let tab = 'todo';
const today = () => new Date().toLocaleDateString('sv-SE');
export function render(el) { tab = 'todo'; list(el); }

async function list(el) {
  let id = localStorage.getItem('workerId');
  if (!id) {
    const { data = [] } = await db.from('workers').select('*').eq('active', true);
    if (data?.length === 1) { id = data[0].id; localStorage.setItem('workerId', id); }
    else {
      el.innerHTML = header('คุณคือใคร?', 'แตะชื่อของคุณ') + `<div class="g">${(data ?? []).map(w => `<button class="c" data-w="${w.id}"><div class="i">${ic('wrench')}</div><div class="t">${esc(w.name)}<small>${esc(w.area)}</small></div></button>`).join('')}</div>`;
      el.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { localStorage.setItem('workerId', b.dataset.w); list(el); });
      return;
    }
  }
  const d = today();
  const [r1, r2, r3] = await Promise.all([db.from('tasks').select('*').eq('worker_id', id).order('due_at'), db.from('routines').select('id,title').eq('active', true).order('sort').order('created_at'), db.from('routine_logs').select('routine_id').eq('log_date', d)]);
  let tasks = r1.data, rt = r2.data ?? [], logs = r3.data ?? [], offline = false;
  if (r1.error) {
    if (!isNet(r1.error)) return el.innerHTML = header('ผิดพลาด', esc(r1.error.message));
    offline = true; tasks = cget('tasks:' + id) ?? []; rt = cget('rt') ?? []; logs = cget('logs:' + d) ?? [];
  } else { cset('tasks:' + id, tasks); cset('rt', rt); cset('logs:' + d, logs); }
  const fin = t => ['submitted', 'approved'].includes(t.status), dn = new Set(logs.map(l => l.routine_id));
  const doneT = tasks.filter(fin), todoT = tasks.filter(t => !fin(t)), doneR = rt.filter(r => dn.has(r.id)), todoR = rt.filter(r => !dn.has(r.id));
  const isDone = tab === 'done', T = isDone ? doneT : todoT, R = isDone ? doneR : todoR;
  el.innerHTML = header('ภารโรงรายงาน', offline ? 'ออฟไลน์ · แสดงข้อมูลล่าสุดในเครื่อง' : 'รายงานงานของฉัน') +
    `<div class="g"><div class="tabs"><button data-tab="todo" class="${isDone ? '' : 'on'}">ยังไม่ได้ทำ (${todoT.length + todoR.length})</button><button data-tab="done" class="${isDone ? 'on' : ''}">เสร็จแล้ว (${doneT.length + doneR.length})</button></div>` +
    T.map(t => `<button class="c" data-t="${t.id}"><div class="i s-${t.status}">${ic('task')}</div><div class="t">${esc(t.title)}<small>${esc(t.detail || '')}${!isDone && t.due_at && new Date(t.due_at) < Date.now() ? ' · <b style="color:#DC2626">เกินกำหนด</b>' : ''}</small></div>${pill(t.status)}</button>`).join('') +
    R.map(r => `<div class="c"><div class="i tone-n">${ic('list', 20)}</div><div class="t">${esc(r.title)}<small>งานประจำวัน${isDone ? ' · ทำแล้ว' : ''}</small></div></div>`).join('') +
    (T.length + R.length ? '' : `<div class="empty">${isDone ? 'ยังไม่มีงานที่เสร็จ' : 'ไม่มีงานค้าง เยี่ยมมาก'}</div>`) + `</div>`;
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; list(el); });
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { const t = tasks.find(x => x.id === b.dataset.t); fin(t) ? toast('งานนี้เสร็จแล้ว') : detail(el, t); });
}

const slot = (k, label, url, loc) => `<div class="slot"><div class="pv">${loc ? `<img src="${loc}" alt="">` : url ? `<img src="${esc(thumb(url))}" alt="">` : ic('camera', 40)}</div><b>${label}${url || loc ? ' ✓' : ''}${loc ? ' (รอส่ง)' : ''}</b><div class="row">
  <label class="p on">${ic('camera', 16)} ถ่ายรูป<input type="file" accept="image/*" capture="environment" hidden data-k="${k}"></label>
  <label class="p">${ic('image', 16)} เลือกจากเครื่อง<input type="file" accept="image/*" hidden data-k="${k}"></label></div></div>`;

function detail(el, t) {
  el.innerHTML = header(esc(t.title), esc(t.detail || 'ถ่ายหรือเลือกรูปก่อนและหลังทำ แล้วส่งงาน')) +
    `<div class="g">${slot('before', 'รูปก่อนทำ', t.photo_before_url, t._lb)}${slot('after', 'รูปหลังทำ', t.photo_after_url, t._la)}
    <button class="b" id="ok">ส่งงานเสร็จแล้ว</button><button class="b o" id="bk">กลับ</button></div>`;
  el.querySelectorAll('input[data-k]').forEach(i => i.onchange = async () => {
    const file = i.files[0]; if (!file) return;
    const k = i.dataset.k, col = k === 'before' ? 'photo_before_url' : 'photo_after_url', loc = k === 'before' ? '_lb' : '_la', ov = busy('กำลังเตรียมรูป…');
    try {
      const p = await prepPhoto(file, m => ov.set(m)), base = `${t.id}/${k}-${Date.now()}`;
      try {
        ov.set('กำลังอัปโหลด… อย่าปิดหน้านี้');
        const url = await sendPhoto(db, base, p.full, p.thumb), patch = { [col]: url, ...(['todo', 'rejected'].includes(t.status) && { status: 'doing' }) };
        const { error } = await db.from('tasks').update(patch).eq('id', t.id); if (error) throw error;
        Object.assign(t, patch); t[loc] = null;
      } catch (e) {
        if (!isNet(e)) throw e;
        await add({ t: 'photo', task: t.id, kind: k, col, base, full: p.full, thumb: p.thumb });
        t[loc] = URL.createObjectURL(p.thumb); toast('ออฟไลน์: เก็บรูปไว้ในเครื่อง จะส่งเมื่อมีสัญญาณ');
      }
      ov.set('เสร็จแล้ว'); await new Promise(r => setTimeout(r, 500));
    } catch (e) { toast('อัปโหลดไม่สำเร็จ: ' + e.message); } finally { ov.done(); }
    detail(el, t);
  });
  el.querySelector('#ok').onclick = async () => {
    if (!(t.photo_before_url || t._lb) || !(t.photo_after_url || t._la)) return toast('ต้องมีรูปก่อนและหลังทำ');
    await flush(); // ส่งรูปที่ค้างในคิวก่อน
    const patch = { status: 'approved', submitted_at: new Date().toISOString() }, { error } = await db.from('tasks').update(patch).eq('id', t.id);
    if (error && isNet(error)) { await add({ t: 'task', id: t.id, patch }); patchTask(t.id, patch); toast('ออฟไลน์: บันทึกไว้ในเครื่อง จะส่งเมื่อมีสัญญาณ'); }
    else toast(error ? error.message : 'บันทึกงานเสร็จแล้ว');
    list(el);
  };
  el.querySelector('#bk').onclick = () => list(el);
}
