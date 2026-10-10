export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const ST = { todo: ['รอทำ', ''], doing: ['กำลังทำ', 'wn'], submitted: ['รอตรวจ', 'wn'], approved: ['อนุมัติ', 'ok'], rejected: ['ตีกลับ', 'er'] };
export const pill = s => `<span class="p ${ST[s]?.[1] ?? ''}">${ST[s]?.[0] ?? s}</span>`;
export const header = (t, s) => `<div class="h"><div class="brand"><span class="lg"><img src="img/logo.webp" alt="" width="30" height="30"></span><span>โรงเรียนบ้านไร่</span></div><h1>${t}</h1><p>${s}</p></div>`;
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
