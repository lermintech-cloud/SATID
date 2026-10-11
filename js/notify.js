// กระดิ่งแจ้งเตือน: แจ้งเฉพาะ "งานค้าง" และ "งานประจำวัน" + เด้งอัตโนมัติเมื่อเข้าใช้ครั้งแรกของวัน
import { db } from './db.js';
import { me } from './me.js';
import { esc, sheet } from './ui.js';
import { ic } from './icons.js';
let items = [];
const today = () => new Date().toLocaleDateString('sv-SE');

export async function refreshBell() {
  let q = db.from('tasks').select('status,due_at').in('status', ['todo', 'doing', 'rejected']);
  if (me.id) q = q.eq('worker_id', me.id);
  const [t, rt, lg] = await Promise.all([q, db.from('routines').select('id').eq('active', true), db.from('routine_logs').select('routine_id').eq('log_date', today())]);
  const open = t.data ?? [], list = [], late = open.filter(x => x.due_at && new Date(x.due_at) < Date.now()).length;
  if (open.length) list.push({ c: 's-doing', t: `งานค้าง ${open.length} งาน`, s: late ? `เกินกำหนด ${late} งาน` : 'เปิดดูรายการงาน', go: 'worker' });
  const ids = new Set((rt.data ?? []).map(r => r.id)), dn = (lg.data ?? []).filter(l => ids.has(l.routine_id)).length;
  if (!rt.error && ids.size && dn < ids.size) list.push({ c: 'tone-n', t: `งานประจำวันนี้ยังไม่ครบ (${dn}/${ids.size})`, s: 'แตะเพื่อไปเช็ค', go: 'today' });
  items = list; me.bell = list.length;
  document.querySelectorAll('[data-bell] .bdg').forEach(b => { b.hidden = !me.bell; b.textContent = me.bell || ''; });
}
export function openNotifs(go) {
  const o = sheet(`แจ้งเตือน${me.name ? ' · ' + me.name : ''}`, items.length
    ? items.map((n, i) => `<button class="c" data-n="${i}"><div class="i ${n.c}">${ic('task', 22)}</div><div class="t">${esc(n.t)}<small>${esc(n.s)}</small></div>›</button>`).join('')
    : `<div class="empty">${ic('ok', 44)}<br>ไม่มีเรื่องที่ต้องทำ เยี่ยมมาก</div>`);
  o.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { o.remove(); scrollTo(0, 0); go(items[b.dataset.n].go); });
}
