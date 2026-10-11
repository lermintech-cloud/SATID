import { db } from '../db.js';
import { esc, toast, header } from '../ui.js';
import { ic } from '../icons.js';
import { add, isNet, cget, cset, localLog } from '../queue.js';
const ymd = () => new Date().toLocaleDateString('sv-SE');
export function render(el) { draw(el); }

// ปุ่มเลื่อนเพื่อยืนยัน (slide to confirm)
function slider(box, onDone) {
  const h = box.querySelector('.sl2h'); let x0 = 0, max = 0, pos = 0, drag = false;
  const set = x => { pos = x; h.style.transform = `translateX(${x}px)`; box.style.setProperty('--p', max ? x / max : 0); };
  h.onpointerdown = e => { drag = true; x0 = e.clientX; max = box.clientWidth - h.clientWidth - 8; h.setPointerCapture(e.pointerId); h.style.transition = 'none'; };
  h.onpointermove = e => { if (drag) set(Math.max(0, Math.min(max, e.clientX - x0))); };
  const end = () => { if (!drag) return; drag = false; h.style.transition = 'transform .25s'; if (pos >= max * .85) { set(max); onDone(); } else set(0); };
  h.onpointerup = end; h.onpointercancel = end;
  h.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') onDone(); };
}
// บันทึกการติ๊ก: ถ้าไม่มีสัญญาณ เก็บเข้าคิวแล้วส่งทีหลัง
async function mark(rows, on, d) {
  const q = db.from('routine_logs');
  const { error } = await (on ? q.upsert(rows.map(rid => ({ routine_id: rid, log_date: d })), { onConflict: 'routine_id,log_date' }) : q.delete().eq('log_date', d).in('routine_id', rows));
  if (error && isNet(error)) { for (const rid of rows) { await add({ t: 'routine', rid, date: d, on }); localLog(d, rid, on); } return null; }
  return error;
}

async function draw(el) {
  const d = ymd();
  let [a, b] = await Promise.all([db.from('routines').select('*').eq('active', true).order('sort').order('created_at'), db.from('routine_logs').select('routine_id').eq('log_date', d)]);
  const head = header('งานวันนี้', new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' }));
  let rt = a.data, lg = b.data ?? [];
  if (a.error) {
    if (!isNet(a.error)) return el.innerHTML = head + `<div class="g"><div class="c" style="display:block"><b>ยังใช้งานไม่ได้</b><br><small>${esc(a.error.message)}</small><br><small>ตรวจว่ารัน sql/routines.sql ใน Supabase แล้ว</small></div></div>`;
    rt = cget('rt') ?? []; lg = cget('logs:' + d) ?? [];
  } else { cset('rt', rt); cset('logs:' + d, lg); }
  const dn = new Set(lg.map(l => l.routine_id)), n = rt.filter(r => dn.has(r.id)).length, allDone = rt.length && n === rt.length;
  const again = (error, m) => { toast(error ? error.message : m); draw(el); };
  el.innerHTML = head + `<div class="g"><div class="c" style="display:block"><b>ทำแล้ว ${n} จาก ${rt.length} รายการ</b><div class="bar"><i style="width:${rt.length ? Math.round(n / rt.length * 100) : 0}%"></i></div></div>` +
    (rt.length ? (allDone
      ? `<div class="c" style="background:#DCFCE7"><div class="i s-approved">${ic('ok', 22)}</div><div class="t">ดำเนินการแล้วทั้งหมด<small>งานประจำวันนี้ครบแล้ว</small></div><button class="p" id="undo">ยกเลิก</button></div>`
      : `<div class="sl2" id="slide"><div class="sl2t">เลื่อนเพื่อดำเนินการแล้วทั้งหมด</div><div class="sl2h" role="slider" tabindex="0" aria-label="เลื่อนเพื่อยืนยัน">${ic('check', 22)}</div></div>`) : '') +
    rt.map((r, i) => `<div class="c"><div class="i tone-${'wtdn'[i % 4]}">${ic('task', 20)}</div><div class="t">${esc(r.title)}<small>${dn.has(r.id) ? 'ทำแล้ว' : 'ยังไม่ได้ทำ'}</small></div><button class="swt ${dn.has(r.id) ? 'on' : ''}" role="switch" aria-checked="${dn.has(r.id)}" aria-label="ทำแล้ว" data-rt="${r.id}"><i></i></button></div>`).join('') +
    (rt.length ? '' : `<div class="empty">ยังไม่มีรายการ เพิ่มได้ที่ ตั้งค่า</div>`) + `</div>`;
  const sl = el.querySelector('#slide');
  if (sl) slider(sl, async () => again(await mark(rt.filter(r => !dn.has(r.id)).map(r => r.id), true, d), 'ดำเนินการครบทุกรายการแล้ว'));
  el.querySelector('#undo')?.addEventListener('click', async () => again(await mark(rt.map(r => r.id), false, d), 'ยกเลิกทั้งหมดแล้ว'));
  el.querySelectorAll('[data-rt]').forEach(x => x.onclick = async () => again(await mark([x.dataset.rt], !dn.has(x.dataset.rt), d), 'บันทึกแล้ว'));
}
