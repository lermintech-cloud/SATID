import { esc, header } from './ui.js';
const ROLES = {
  worker:   { label: 'ภารโรง',       icon: '🧹', sub: 'ดูงาน ส่งงาน',          load: () => import('./views/worker.js') },
  teacher:  { label: 'ครู',          icon: '👩‍🏫', sub: 'มอบหมาย ตรวจรับงาน',   load: () => import('./views/teacher.js') },
  director: { label: 'ผู้อำนวยการ',  icon: '🏫', sub: 'สรุปภาพรวม ติดตามงาน', load: () => import('./views/director.js') },
};
const app = document.getElementById('app'), back = document.getElementById('back');

function landing() {
  back.hidden = true; localStorage.removeItem('role');
  app.innerHTML = `<div class="landing">${header('🧹 ระบบนักการภารโรง', 'โรงเรียนบ้านไร่')}<div class="g"><p style="text-align:center;font-weight:600">เข้าใช้งานในฐานะ</p>` +
    Object.entries(ROLES).map(([k, r]) => `<button class="c" data-r="${k}" style="min-height:92px"><div class="i" style="width:60px;height:60px;font-size:30px">${r.icon}</div><div class="t">${esc(r.label)}<small>${esc(r.sub)}</small></div>›</button>`).join('') + `</div></div>`;
  app.querySelectorAll('[data-r]').forEach(b => b.onclick = () => go(b.dataset.r));
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
