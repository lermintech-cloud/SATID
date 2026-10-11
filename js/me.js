// ข้อมูลภารโรงที่ใช้งานอยู่ (แสดงรูปโปรไฟล์มุมขวาบนของทุกหน้า)
import { db } from './db.js';
import { thumb } from './image.js';
import { ic } from './icons.js';
export const me = { id: null, name: '', photo: '', bell: 0 };
const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const avatar = () => me.photo ? `<img src="${E(thumb(me.photo))}" alt="">` : ic('user', 22);
export const paintMe = () => document.querySelectorAll('[data-me]').forEach(b => b.innerHTML = avatar());
export async function loadMe() {
  let r = await db.from('workers').select('id,name,photo_url').eq('active', true);
  if (r.error) r = await db.from('workers').select('id,name').eq('active', true); // ยังไม่ได้เพิ่มคอลัมน์รูป
  const list = r.data ?? [], w = list.length === 1 ? list[0] : list.find(x => x.id === localStorage.getItem('workerId'));
  if (w) { Object.assign(me, { id: w.id, name: w.name, photo: w.photo_url || '' }); localStorage.setItem('workerId', w.id); }
  paintMe();
}
