import './install.js';
import { initQueue } from './queue.js';
import { esc, header } from './ui.js';
import { ic } from './icons.js';
import { loadMe, me } from './me.js';
import { refreshBell, openNotifs } from './notify.js';
const ROLES = {
  worker:   { label: 'ภารโรงรายงาน', icon: 'wrench', load: () => import('./views/worker.js') },
  teacher:  { label: 'งานพิเศษ',     icon: 'cap',    load: () => import('./views/teacher.js') },
  director: { label: 'ผู้อำนวยการ', icon: 'dash',   load: () => import('./views/director.js') },
  today:    { label: 'งานวันนี้',   icon: 'list',   load: () => import('./views/today.js') },
  contact:  { label: 'ติดต่อ',      icon: 'phone',  action: () => import('./lists.js').then(m => m.showContacts()) },
  settings: { label: 'ตั้งค่า',     icon: 'gear',   load: () => import('./views/settings.js') },
  profile:  { label: 'โปรไฟล์',     icon: 'user',   load: () => import('./views/profile.js') },
};
// แถบเมนูล่าง: [คีย์, ป้าย, ไอคอน] ปุ่มกลาง (ภารโรง) เป็นปุ่มนูน
const NAV = [['home', 'หน้าแรก', 'home'], ['today', 'งานวันนี้', 'list'], ['worker', 'รายงาน', 'wrench'], ['teacher', 'งานพิเศษ', 'cap'], ['director', 'ผอ.', 'dash']];
const TONE = { worker: 'w', teacher: 't', director: 'd', today: 'n', contact: 'c', settings: 's' };
const THEMES = { home: '#0B5D57', worker: '#047857', teacher: '#1E40AF', director: '#5B21B6', today: '#C2410C', profile: '#0B5D57', settings: '#334155' };
const app = document.getElementById('app'), nav = document.getElementById('nav');

const bell = document.createElement('button');
bell.className = 'bell fl'; bell.setAttribute('data-bell', ''); bell.setAttribute('aria-label', 'แจ้งเตือน');
bell.innerHTML = `${ic('bell', 22)}<i class="bdg" hidden></i>`;
document.body.append(bell);

function setTheme(k) {
  document.body.dataset.theme = k; document.querySelector('meta[name=theme-color]').content = THEMES[k];
  nav.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.n === k));
}
nav.innerHTML = NAV.map(([k, l, i], n) => `<button data-n="${k}" class="${n === 2 ? 'nc' : ''}"><span class="ni">${ic(i, n === 2 ? 28 : 22)}</span><span>${l}</span></button>`).join('');
nav.querySelectorAll('button').forEach(b => b.onclick = () => { scrollTo(0, 0); b.dataset.n === 'home' ? landing() : go(b.dataset.n); });

function landing() {
  localStorage.removeItem('role'); setTheme('home'); refreshBell(true);
  app.innerHTML = `<div class="landing">${header('ระบบนักการภารโรง', 'โรงเรียนบ้านไร่ อ.ดอยเต่า จ.เชียงใหม่')}<div class="g"><div class="sk"><p class="skt">${ic('bolt', 18)} เมนูทางลัด</p><div class="sg">` +
    Object.entries(ROLES).filter(([k]) => k !== 'profile').map(([k, r]) => `<button data-r="${k}"><span class="tile tl-${TONE[k]}">${ic(r.icon, 30)}</span>${esc(r.label)}</button>`).join('') +
    `</div></div></div><div id="dash"></div></div>`;
  app.querySelectorAll('[data-r]').forEach(b => b.onclick = () => go(b.dataset.r));
  import('./views/dashboard.js').then(m => m.renderDashboard(document.getElementById('dash'))).catch(() => {});
}
async function go(k) {
  if (ROLES[k].action) return ROLES[k].action();
  localStorage.setItem('role', k); setTheme(k); refreshBell(true);
  app.innerHTML = `<div class="empty">กำลังโหลด…</div>`;
  try { (await ROLES[k].load()).render(app); }
  catch (e) { app.innerHTML = header('เกิดข้อผิดพลาด', esc(e.message)) + `<div class="g"><button class="b" onclick="location.reload()">ลองใหม่</button></div>`; }
}
document.addEventListener('click', e => { if (e.target.closest('[data-me]')) { scrollTo(0, 0); go('profile'); } else if (e.target.closest('[data-bell]')) openNotifs(go); });
landing(); // เปิดแอปครั้งไหนก็เริ่มที่หน้าแรกเสมอ
initQueue();
loadMe().then(async () => { await refreshBell(true); const d = new Date().toLocaleDateString('sv-SE'); if (me.bell && localStorage.getItem('notifAuto') !== '0' && localStorage.getItem('notifDay') !== d) { localStorage.setItem('notifDay', d); openNotifs(go); } });
setTimeout(() => { const s = document.getElementById('splash'); s.classList.add('hide'); setTimeout(() => s.remove(), 450); }, 1500);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
