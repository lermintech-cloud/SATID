import { db } from '../db.js';
import { esc, header } from '../ui.js';

export async function render(el) {
  const { data: ts, error } = await db.from('tasks').select('status,workers(name)');
  if (error) return el.innerHTML = header('ผิดพลาด', esc(error.message));
  const n = list => ts.filter(t => list.includes(t.status)).length, by = {};
  ts.forEach(t => { const k = t.workers?.name || '-'; (by[k] ??= { a: 0, d: 0 }).a++; if (['submitted', 'approved'].includes(t.status)) by[k].d++; });
  el.innerHTML = header('ผู้อำนวยการ', 'สรุปภาพรวม') + `<div class="g"><div class="st">
    <div><b style="color:#16A34A">${n(['approved'])}</b>อนุมัติ</div><div><b style="color:#F59E0B">${n(['submitted', 'doing'])}</b>กำลังทำ</div><div><b style="color:#DC2626">${n(['todo', 'rejected'])}</b>ค้าง</div></div>` +
    (Object.entries(by).map(([k, v]) => `<div class="c" style="display:block"><b>${esc(k)}</b> <small>${v.d}/${v.a}</small><div class="bar"><i style="width:${Math.round(v.d / v.a * 100)}%"></i></div></div>`).join('') || `<div class="empty">ยังไม่มีงาน</div>`) + `</div>`;
}
