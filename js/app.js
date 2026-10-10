import { esc, header } from './ui.js';
import { ic } from './icons.js';
const ROLES = {
  worker:   { label: 'ภารโรง',      icon: 'wrench', load: () => import('./views/worker.js') },
  teacher:  { label: 'ครู',         icon: 'cap',    load: () => import('./views/teacher.js') },
  director: { label: 'ผู้อำนวยการ', icon: 'dash',   load: () => import('./views/director.js') },
  today:    { label: 'งานวันนี้',   icon: 'list',   load: () => import('./views/today.js') },
};
const app = document.getElementById('app'), back = document.getElementById('back');

function landing() {
  back.hidden = true; localStorage.removeItem('role');
  app.innerHTML = `<div class="landing">${header('ระบบนักการภารโรง', 'โรงเรียนบ้านไร่ อ.ดอยเต่า จ.เชียงใหม่')}<div class="g"><p style="text-align:center;font-weight:600">เข้าใช้งานในฐานะ</p><div class="roles">` +
    Object.entries(ROLES).filter(([k]) => k !== 'today').map(([k, r]) => `<button class="c" data-r="${k}"><div class="i">${ic(r.icon, 24)}</div><div class="t">${esc(r.label)}</div></button>`).join('') +
    `</div><button class="c wide" data-r="today"><div class="i">${ic('list', 26)}</div><div class="t">งานวันนี้<small>งานประจำที่ต้องทำทุกวัน กดดำเนินการแล้วได้เลย</small></div></button></div><div id="dash"></div></div>`;
  app.querySelectorAll('[data-r]').forEach(b => b.onclick = () => go(b.dataset.r));
  import('./views/dashboard.js').then(m => m.renderDashboard(document.getElementById('dash'))).catch(() => {});
}
async function go(k) {
  localStorage.setItem('role', k); back.hidden = false;
  app.innerHTML = `<div class="empty">กำลังโหลด…</div>`;
  try { (await ROLES[k].load()).render(app); }
  catch (e) { app.innerHTML = header('เกิดข้อผิดพลาด', esc(e.message)) + `<div class="g"><button class="b" onclick="location.reload()">ลองใหม่</button></div>`; }
}
back.onclick = landing;
ROLES[localStorage.getItem('role')] ? go(localStorage.getItem('role')) : landing();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
