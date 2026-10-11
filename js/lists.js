import { esc, pill, sheet, lightbox } from './ui.js';
import { thumb } from './image.js';
import { ic } from './icons.js';
const fmt = d => new Date(d).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function showTasks(title, list) {
  const rows = list.map((t, i) => {
    const late = t.due_at && !['approved', 'submitted'].includes(t.status) && new Date(t.due_at) < Date.now();
    const when = t.status === 'approved' && t.submitted_at ? 'เสร็จ ' + fmt(t.submitted_at) : t.due_at ? 'กำหนด ' + fmt(t.due_at) : '';
    return `<button class="c" data-i="${i}">${t.photo_after_url ? `<img class="av" src="${esc(thumb(t.photo_after_url))}" alt="">` : `<div class="i s-${t.status}">${ic('task')}</div>`}<div class="t">${esc(t.title)}<small>${esc(t.workers?.name || '')}${when ? ' · ' + when : ''}${late ? ' · <b style="color:#DC2626">เกินกำหนด</b>' : ''}</small></div>${pill(t.status)}</button>`;
  }).join('');
  const o = sheet(`${title} (${list.length})`, rows || '<div class="empty">ไม่มีรายการ</div>');
  o.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
    const t = list[b.dataset.i];
    if (t.photo_before_url || t.photo_after_url) lightbox([{ url: t.photo_before_url, label: 'ก่อนทำ' }, { url: t.photo_after_url, label: 'หลังทำ' }]);
  });
}
export function showRoutines(rts, done) {
  sheet(`งานประจำวันนี้ (${rts.filter(r => done.has(r.id)).length}/${rts.length})`, rts.map(r => `<div class="c"><div class="ck ${done.has(r.id) ? 'y' : ''}">${done.has(r.id) ? '✓' : ''}</div><div class="t">${esc(r.title)}</div>${done.has(r.id) ? '<span class="p ok">ทำแล้ว</span>' : '<span class="p">ยังไม่ทำ</span>'}</div>`).join('') || '<div class="empty">ยังไม่มีรายการ</div>');
}
