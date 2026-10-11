// คิวทำงานออฟไลน์: เก็บการส่งงาน/รูป/ติ๊กงานประจำไว้ใน IndexedDB แล้วส่งเองเมื่อมีสัญญาณ
import { db } from './db.js';
import { sendPhoto } from './image.js';
const run = f => new Promise((res, rej) => {
  const o = indexedDB.open('bc', 1);
  o.onupgradeneeded = () => o.result.createObjectStore('q', { keyPath: 'id', autoIncrement: true });
  o.onerror = () => rej(o.error);
  o.onsuccess = () => { const t = o.result.transaction('q', 'readwrite'), req = f(t.objectStore('q')); t.oncomplete = () => res(req.result); t.onerror = () => rej(t.error); };
});
const all = () => run(s => s.getAll());
export const isNet = e => !navigator.onLine || /fetch|network|load failed/i.test(e?.message || '');
export const add = op => run(s => s.add({ ...op, tries: 0 })).then(() => { paint(); flush(); });
export const cget = k => { try { return JSON.parse(localStorage.getItem('c:' + k)); } catch { return null; } };
export const cset = (k, v) => { try { localStorage.setItem('c:' + k, JSON.stringify(v)); } catch { /* เต็ม ข้ามได้ */ } };
export function patchTask(id, patch) {
  Object.keys(localStorage).filter(k => k.startsWith('c:tasks:')).forEach(k => { const l = JSON.parse(localStorage[k]), t = l.find(x => x.id === id); if (t) { Object.assign(t, patch); localStorage[k] = JSON.stringify(l); } });
}
export function localLog(d, rid, on) { const l = (cget('logs:' + d) ?? []).filter(x => x.routine_id !== rid); if (on) l.push({ routine_id: rid }); cset('logs:' + d, l); }

let working = false;
export async function flush() {
  if (working || !navigator.onLine) return; working = true;
  try {
    for (const op of await all()) {
      try {
        let e;
        if (op.t === 'photo') { const url = await sendPhoto(db, op.base, op.full, op.thumb); ({ error: e } = await db.from('tasks').update({ [op.col]: url }).eq('id', op.task)); }
        else if (op.t === 'task') ({ error: e } = await db.from('tasks').update(op.patch).eq('id', op.id));
        else ({ error: e } = await (op.on ? db.from('routine_logs').upsert({ routine_id: op.rid, log_date: op.date }, { onConflict: 'routine_id,log_date' }) : db.from('routine_logs').delete().eq('routine_id', op.rid).eq('log_date', op.date)));
        if (e) throw e;
        await run(s => s.delete(op.id));
      } catch (e) {
        if (isNet(e)) break; // ยังไม่มีสัญญาณ รอรอบหน้า
        if (++op.tries >= 3) await run(s => s.delete(op.id)); else await run(s => s.put(op)); // ผิดพลาดซ้ำ 3 ครั้ง ตัดทิ้ง
      }
    }
  } finally { working = false; paint(); }
}
export async function paint() {
  const el = document.getElementById('qb'); if (!el) return;
  const n = (await all()).length, off = !navigator.onLine;
  el.hidden = !n && !off;
  el.innerHTML = `${off ? 'ออฟไลน์' : 'ออนไลน์'}${n ? ` · รอส่ง ${n} รายการ` : ''}${n && !off ? ' <button id="qf">ส่งเลย</button>' : ''}`;
  el.querySelector('#qf')?.addEventListener('click', flush);
}
export function initQueue() {
  const b = Object.assign(document.createElement('div'), { id: 'qb', hidden: true }); document.body.append(b);
  addEventListener('online', () => { paint(); flush(); }); addEventListener('offline', paint);
  setInterval(flush, 30000); flush(); paint();
}
