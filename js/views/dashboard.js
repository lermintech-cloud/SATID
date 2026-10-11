import { db } from '../db.js';
import { esc, lightbox } from '../ui.js';
import { thumb } from '../image.js';
import { ic } from '../icons.js';
import { showTasks, showRoutines } from '../lists.js';

const fmt = d => new Date(d).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const MEDAL = ['🥇', '🥈', '🥉'], F = 'title,status,due_at,submitted_at,photo_before_url,photo_after_url,workers(name)';

export async function renderDashboard(el) {
  if (!el) return;
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const [r, o, rt, lg] = await Promise.all([
    db.from('tasks').select(F).eq('status', 'approved').gte('submitted_at', since).order('submitted_at', { ascending: false }).limit(200),
    db.from('tasks').select(F).in('status', ['todo', 'doing', 'rejected']).order('due_at').limit(100),
    db.from('routines').select('id,title').eq('active', true).order('sort').order('created_at'),
    db.from('routine_logs').select('routine_id').eq('log_date', new Date().toLocaleDateString('sv-SE'))]);
  if (r.error || !r.data) return; // แดชบอร์ดล้มเหลวต้องไม่ทำให้หน้าแรกพัง
  const data = r.data, open = o.data ?? [], late = open.filter(t => t.due_at && new Date(t.due_at) < Date.now());
  const rts = rt.data ?? [], dn = new Set((lg.data ?? []).map(l => l.routine_id));
  const rd = rt.error ? '–' : `${rts.filter(x => dn.has(x.id)).length}/${rts.length}`;
  const tiles = [['g-gr', 'check', 'งานเสร็จ (7 วัน)', data.length, 'done'], ['g-or', 'wrench', 'งานค้าง', open.length, 'open'], ['g-bl', 'task', 'เกินกำหนด', late.length, 'late'], ['g-vi', 'list', 'งานประจำวันนี้', rd, 'rt']];
  const by = {}; data.forEach(t => { const k = t.workers?.name || '-'; by[k] = (by[k] || 0) + 1; });
  const rank = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 3), rec = data.slice(0, 8);
  const av = t => t.photo_after_url ? `<img class="av lg" src="${esc(thumb(t.photo_after_url))}" alt="" loading="lazy">` : `<div class="av lg">${esc((t.workers?.name || '?')[0])}</div>`;
  el.innerHTML = `<div class="g"><div class="gts">${tiles.map(([c, i, l, v, k]) => `<button class="gt ${c}" data-t="${k}"><div class="gi">${ic(i, 26)}</div><div><small>${l}</small><b>${v}</b></div></button>`).join('')}</div>` +
    (rank.length ? `<p class="sec">ผลงานเด่น</p><div class="c" style="display:block">${rank.map(([n, v], i) => `<div class="rk"><span>${MEDAL[i]} ${esc(n)}</span><b>${v} งาน</b></div>`).join('')}</div>` : '') +
    `<p class="sec">งานที่ทำล่าสุด <small style="font-weight:400;color:var(--mut)">แตะรูปเพื่อดูภาพก่อน-หลัง</small></p>` +
    (rec.map((t, i) => `<button class="c" data-i="${i}">${av(t)}<div class="t">${esc(t.title)}<small>${esc(t.workers?.name || '')} · ${fmt(t.submitted_at)}</small></div></button>`).join('') || `<div class="empty">ยังไม่มีงานที่เสร็จ</div>`) + `</div>`;
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => ({ done: () => showTasks('งานเสร็จ 7 วันล่าสุด', data), open: () => showTasks('งานค้าง', open), late: () => showTasks('งานเกินกำหนด', late), rt: () => showRoutines(rts, dn) })[b.dataset.t]());
  el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
    const t = rec[b.dataset.i];
    if (t.photo_before_url || t.photo_after_url) lightbox([{ url: t.photo_before_url, label: 'ก่อนทำ' }, { url: t.photo_after_url, label: 'หลังทำ' }]);
  });
}
