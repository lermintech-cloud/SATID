// แถบชวนติดตั้งแอป (PWA): Android ใช้ beforeinstallprompt, iPhone แสดงคำแนะนำ
let deferred = null;
const KEY = 'installDismissed';
export const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
export const canInstall = () => !!deferred;

function banner(text, withBtn) {
  if (document.getElementById('ib') || localStorage.getItem(KEY) || installed()) return;
  const d = document.createElement('div'); d.id = 'ib'; d.className = 'ib';
  d.innerHTML = `<img src="img/icon-192.png" alt="" width="40" height="40"><div class="t">ติดตั้งแอปลงเครื่อง<small>${text}</small></div>${withBtn ? '<button class="p on" id="ibi">ติดตั้ง</button>' : ''}<button class="x2" id="ibx" aria-label="ปิด">✕</button>`;
  document.body.append(d);
  d.querySelector('#ibx').onclick = () => { localStorage.setItem(KEY, '1'); d.remove(); };
  d.querySelector('#ibi')?.addEventListener('click', install);
}
export async function install() {
  if (!deferred) return false;
  deferred.prompt(); const r = await deferred.userChoice; deferred = null;
  document.getElementById('ib')?.remove(); return r.outcome === 'accepted';
}
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; setTimeout(() => banner('เปิดใช้งานได้เร็ว เหมือนแอปทั่วไป', true), 2000); });
addEventListener('appinstalled', () => { deferred = null; document.getElementById('ib')?.remove(); });
if (isIOS && !installed()) setTimeout(() => banner('iPhone: แตะปุ่มแชร์ แล้วเลือก “เพิ่มไปยังหน้าจอโฮม”', false), 2500);
