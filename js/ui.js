import { avatar, me } from './me.js';
import { ic } from './icons.js';
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const ST = { todo: ['รอทำ', ''], doing: ['กำลังทำ', 'wn'], submitted: ['รอตรวจ', 'wn'], approved: ['เสร็จแล้ว', 'ok'], rejected: ['ตีกลับ', 'er'] };
export const pill = s => `<span class="p ${ST[s]?.[1] ?? ''}">${ST[s]?.[0] ?? s}</span>`;
export const header = (t, s) => `<div class="h"><div class="brand"><span class="lg"><img src="img/logo-v2.webp" alt="" width="30" height="30"></span><span>โรงเรียนบ้านไร่</span></div><button class="me" data-me aria-label="โปรไฟล์">${avatar()}</button><button class="bell" data-bell aria-label="แจ้งเตือน">${ic('bell', 20)}<i class="bdg" ${me.bell ? '' : 'hidden'}>${me.bell || ''}</i></button><h1>${t}</h1><p>${s}</p></div>`;
export function toast(m) {
  const t = Object.assign(document.createElement('div'), { className: 'toast', textContent: m });
  document.body.append(t); setTimeout(() => t.remove(), 2200);
}
export function busy(msg) {
  const o = document.createElement('div'); o.className = 'ov'; o.innerHTML = '<div class="sp"></div><p></p>';
  document.body.append(o); const p = o.querySelector('p'); p.textContent = msg;
  return { set: m => p.textContent = m, done: () => o.remove() };
}
export function lightbox(items) {
  const o = document.createElement('div'); o.className = 'lb';
  o.innerHTML = `<button class="x" aria-label="ปิด">✕</button><div class="lbc">${items.filter(i => i.url).map(i => `<figure><img src="${esc(i.url)}" alt="${esc(i.label)}"><figcaption>${esc(i.label)}</figcaption></figure>`).join('')}</div>`;
  o.onclick = e => { if (e.target === o || e.target.className === 'x' || e.target.className === 'lbc') o.remove(); };
  document.body.append(o);
}
export function sheet(title, html) {
  const o = document.createElement('div'); o.className = 'sheet';
  o.innerHTML = `<div class="sheet-c"><div class="sheet-h"><b>${esc(title)}</b><button class="x2" aria-label="ปิด">✕</button></div><div class="sheet-b">${html}</div></div>`;
  o.onclick = e => { if (e.target === o || e.target.closest('.x2')) o.remove(); };
  document.body.append(o); return o;
}
