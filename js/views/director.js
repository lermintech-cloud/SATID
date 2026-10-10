import { db } from '../db.js';
import { esc, header, pill } from '../ui.js';
import { ic } from '../icons.js';
const DAYS = 14, ymd = d => new Date(d).toLocaleDateString('sv-SE');

export async function render(el) {
  const [{ data: ts, error }, r2, r3] = await Promise.all([
    db.from('tasks').select('title,status,due_at,created_at,submitted_at,workers(name)').order('created_at', { ascending: false }).limit(500),
    db.from('routines').select('id').eq('active', true),
    db.from('routine_logs').select('routine_id').eq('log_date', ymd(Date.now()))]);
  if (error) return el.innerHTML = header('ผิดพลาด', esc(error.message));
  const now = Date.now(), ids = new Set((r2.data ?? []).map(r => r.id));
  const rDone = (r3.data ?? []).filter(l => ids.has(l.routine_id)).length;
  const open = ts.filter(t => ['todo', 'doing', 'rejected'].includes(t.status));
  const wait = ts.filter(t => t.status === 'submitted');
  const late = open.filter(t => t.due_at && new Date(t.due_at) < now);
  const days = [...Array(DAYS)].map((_, i) => ymd(now - (DAYS - 1 - i) * 864e5));
  const cnt = f => days.map(d => ts.filter(t => t[f] && ymd(t[f]) === d).length);
  const as = cnt('created_at'), dn = cnt('submitted_at'), mx = Math.max(1, ...as, ...dn);
  const peak = Math.max(...as), peakDay = peak ? days[as.indexOf(peak)] : null;
  const idle = !open.length && !wait.length;
  const bar = (v, c) => `<i style="height:${Math.max(3, v / mx * 100)}%;background:${c}" title="${v}"></i>`;
  el.innerHTML = header('ผู้อำนวยการ', 'ภาพรวมงานภารโรง') + `<div class="g">
    <div class="c" style="background:${idle ? '#F0FDF4' : '#FFFBEB'}"><div class="i ${idle ? 's-approved' : 's-doing'}">${ic(idle ? 'ok' : 'wrench', 26)}</div><div class="t">${idle ? 'ภารโรงว่าง ไม่มีงานค้าง' : `มีงานค้าง ${open.length} งาน`}<small>${late.length ? `เกินกำหนด ${late.length} งาน` : 'ไม่มีงานเกินกำหนด'} · รอตรวจ ${wait.length}</small></div></div>
    <div class="st"><div><b style="color:#16A34A">${ts.filter(t => t.status === 'approved').length}</b>อนุมัติ</div><div><b style="color:#F59E0B">${wait.length}</b>รอตรวจ</div><div><b style="color:#DC2626">${open.length}</b>ค้าง</div><div><b>${rDone}/${ids.size}</b>งานประจำ</div></div>
    <p class="sec">ปริมาณงาน ${DAYS} วันล่าสุด</p>
    <div class="c" style="display:block"><div class="ch">${days.map((d, i) => `<div>${bar(as[i], '#A5B4FC')}${bar(dn[i], '#34D399')}</div>`).join('')}</div>
    <div class="ch-l">${days.map(d => `<span>${+d.slice(8)}</span>`).join('')}</div>
    <div class="lg"><span><i style="background:#A5B4FC"></i>มอบหมาย</span><span><i style="background:#34D399"></i>ส่งงาน</span></div>
    ${peakDay ? `<small style="color:var(--mut)">วันที่มอบหมายมากที่สุด: ${new Date(peakDay).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} (${peak} งาน)</small>` : ''}</div>
    <p class="sec">งานค้างและรอตรวจ</p>` +
    ([...late, ...open.filter(t => !late.includes(t)), ...wait].slice(0, 15).map(t => `<div class="c"><div class="t">${esc(t.title)}<small>${esc(t.workers?.name || '')}${late.includes(t) ? ' · <b style="color:#DC2626">เกินกำหนด</b>' : ''}</small></div>${pill(t.status)}</div>`).join('') || `<div class="empty">ไม่มีงานค้าง</div>`) + `</div>`;
}
