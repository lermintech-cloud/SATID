import { db } from '../db.js';
import { esc } from '../ui.js';

const fmt = d => new Date(d).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const MEDAL = ['🥇', '🥈', '🥉'];

export async function renderDashboard(el) {
  if (!el) return;
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data, error } = await db.from('tasks').select('title,submitted_at,due_at,photo_url,workers(name)')
    .eq('status', 'approved').gte('submitted_at', since).order('submitted_at', { ascending: false }).limit(200);
  if (error || !data) return; // แดชบอร์ดล้มเหลวต้องไม่ทำให้หน้าแรกพัง
  const timed = data.filter(t => t.due_at);
  const ontime = timed.filter(t => new Date(t.submitted_at) <= new Date(t.due_at)).length;
  const pct = timed.length ? Math.round(ontime / timed.length * 100) + '%' : '–';
  const by = {}; data.forEach(t => { const k = t.workers?.name || '-'; by[k] = (by[k] || 0) + 1; });
  const rank = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const av = t => t.photo_url ? `<img class="av" src="${esc(t.photo_url)}" alt="" loading="lazy">` : `<div class="av">${esc((t.workers?.name || '?')[0])}</div>`;
  el.innerHTML = `<div class="g"><p class="sec">ผลงาน 7 วันล่าสุด</p>
    <div class="st"><div><b>${data.length}</b>งานเสร็จ</div><div><b>${pct}</b>ตรงเวลา</div></div>` +
    (rank.length ? `<div class="c" style="display:block">${rank.map(([n, v], i) => `<div class="rk"><span>${MEDAL[i]} ${esc(n)}</span><b>${v} งาน</b></div>`).join('')}</div>` : '') +
    `<p class="sec">งานที่ทำล่าสุด</p>` +
    (data.slice(0, 8).map(t => `<div class="c">${av(t)}<div class="t">${esc(t.title)}<small>${esc(t.workers?.name || '')} · ${fmt(t.submitted_at)}</small></div></div>`).join('') || `<div class="empty">ยังไม่มีงานที่อนุมัติ</div>`) + `</div>`;
}
