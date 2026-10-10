export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const ST = { todo: ['รอทำ', ''], doing: ['กำลังทำ', 'wn'], submitted: ['รอตรวจ', 'wn'], approved: ['อนุมัติ', 'ok'], rejected: ['ตีกลับ', 'er'] };
export const pill = s => `<span class="p ${ST[s]?.[1] ?? ''}">${ST[s]?.[0] ?? s}</span>`;
export const header = (t, s) => `<div class="h"><h1>${t}</h1><p>${s}</p></div>`;
export function toast(m) {
  const t = Object.assign(document.createElement('div'), { className: 'toast', textContent: m });
  document.body.append(t); setTimeout(() => t.remove(), 2200);
}
