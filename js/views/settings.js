import { db } from '../db.js';
import { esc, toast, header, ST } from '../ui.js';
import { ic } from '../icons.js';
import { install, canInstall, installed, isIOS } from '../install.js';
const VERSION = '1.0';
const sw = (k, on) => `<button class="swt ${on ? 'on' : ''}" role="switch" aria-checked="${!!on}" data-sw="${k}"><i></i></button>`;
const row = (i, t, s, right = '') => `<div class="c"><div class="i">${ic(i, 20)}</div><div class="t">${t}<small>${s}</small></div>${right}</div>`;
const btn = (id, label, cls = 'on') => `<button class="p ${cls}" id="${id}">${label}</button>`;

export async function render(el) {
  const r = await db.from('settings').select('key,value'), ready = !r.error;
  const S = Object.fromEntries((r.data ?? []).map(x => [x.key, x.value])), on = k => S[k] === '1';
  const save = (key, value) => db.from('settings').upsert({ key, value, updated_at: new Date().toISOString() });
  el.innerHTML = header('ตั้งค่า', 'ควบคุมระบบและการแจ้งเตือน') + `<div class="g">
    <p class="sec">แจ้งเตือนผ่าน Telegram</p>` +
    (ready ? '' : `<div class="c" style="display:block"><b>ยังบันทึกการตั้งค่าไม่ได้</b><br><small>รัน sql/settings.sql ใน Supabase ก่อน (${esc(r.error.message)})</small></div>`) +
    row('send', 'เปิดใช้แจ้งเตือนเข้ากลุ่ม', 'ส่งข้อความเข้ากลุ่ม Telegram', sw('tg_enabled', on('tg_enabled'))) +
    `<div class="c" style="display:block"><small>Chat ID ของกลุ่ม</small><input class="in" id="chat" value="${esc(S.tg_chat_id || '')}" placeholder="เช่น -1001234567890" style="margin-top:6px"></div>` +
    row('check', 'เมื่อภารโรงทำงานเสร็จ', 'พร้อมรูปก่อน-หลัง', sw('tg_on_done', on('tg_on_done'))) +
    row('task', 'เมื่องานเกินกำหนด', 'เตือนครูและภารโรง', sw('tg_on_late', on('tg_on_late'))) +
    row('list', 'สรุปงานประจำวัน', 'ส่งสรุปตอนเย็น', sw('tg_daily', on('tg_daily'))) +
    `<div class="c" style="display:block;background:#FFF8E6"><b>สถานะ: ยังไม่เชื่อมต่อ</b><br><small>ระบบบันทึกค่าเหล่านี้ไว้แล้ว แต่ข้อความจะส่งจริงหลังติดตั้ง Edge Function และใส่โทเคนบอทเป็นความลับฝั่งเซิร์ฟเวอร์ (ไม่ใส่ในหน้านี้เพื่อความปลอดภัย)</small></div>
    <p class="sec">การแจ้งเตือนในแอป</p>` +
    row('bell', 'เด้งแจ้งเตือนครั้งแรกของวัน', 'เมื่อเปิดแอปครั้งแรกของแต่ละวัน', sw('auto', localStorage.getItem('notifAuto') !== '0')) +
    `<p class="sec">ติดตั้งแอป</p>` +
    (installed() ? row('ok', 'ติดตั้งแล้ว', 'กำลังใช้งานแบบแอป') : canInstall() ? row('download', 'ติดตั้งแอปลงเครื่อง', 'เปิดได้จากหน้าจอโฮม', btn('inst', 'ติดตั้ง'))
      : row('download', isIOS ? 'ติดตั้งบน iPhone' : 'ติดตั้งแอป', isIOS ? 'แตะปุ่มแชร์ แล้วเลือก เพิ่มไปยังหน้าจอโฮม' : 'เปิดเมนูเบราว์เซอร์ แล้วเลือก ติดตั้งแอป')) +
    `<p class="sec">ข้อมูลและการบำรุงรักษา</p>` +
    row('download', 'ส่งออกรายการงาน (CSV)', 'เปิดด้วย Excel ได้', btn('csv', 'ส่งออก')) +
    row('refresh', 'อัปเดตแอป / ล้างแคช', 'ใช้เมื่ออัปเดตแล้วหน้าตาไม่เปลี่ยน', btn('upd', 'ทำเลย')) +
    row('trash', 'ล้างข้อมูลที่จำในเครื่องนี้', 'ชื่อภารโรงที่เลือกไว้และค่าในเครื่อง', btn('clr', 'ล้าง', 'er')) +
    `<p class="sec">ความปลอดภัย</p>` + row('shield', 'ยังไม่ได้ตั้ง PIN', 'ใครมีลิงก์ก็เข้าและแก้ข้อมูลได้ ควรเพิ่ม PIN ก่อนใช้ข้อมูลจริง') +
    `<p class="sec">เกี่ยวกับ</p>` + row('info', `ระบบนักการภารโรง v${VERSION}`, 'พัฒนาโดย ครูเฉลิมพล จันทร์แดง · โรงเรียนบ้านไร่') +
    row(ready ? 'ok' : 'x', 'การเชื่อมต่อฐานข้อมูล', ready ? 'ปกติ' : 'ยังไม่มีตาราง settings') + `</div>`;

  el.querySelectorAll('[data-sw]').forEach(b => b.onclick = async () => {
    const k = b.dataset.sw, v = !b.classList.contains('on');
    if (k === 'auto') { localStorage.setItem('notifAuto', v ? '1' : '0'); }
    else { const { error } = await save(k, v ? '1' : '0'); if (error) return toast(error.message); }
    b.classList.toggle('on', v); b.setAttribute('aria-checked', v);
  });
  el.querySelector('#chat').onchange = async e => { const { error } = await save('tg_chat_id', e.target.value.trim()); toast(error ? error.message : 'บันทึก Chat ID แล้ว'); };
  el.querySelector('#inst')?.addEventListener('click', async () => { if (await install()) render(el); });
  el.querySelector('#upd').onclick = async () => {
    (await navigator.serviceWorker?.getRegistrations?.() ?? []).forEach(x => x.unregister());
    (await caches?.keys?.() ?? []).forEach(k => caches.delete(k)); toast('ล้างแคชแล้ว กำลังโหลดใหม่…'); setTimeout(() => location.reload(), 800);
  };
  el.querySelector('#clr').onclick = () => { if (confirm('ล้างข้อมูลที่จำไว้ในเครื่องนี้?')) { ['workerId', 'role', 'notifDay', 'notifAuto', 'installDismissed'].forEach(k => localStorage.removeItem(k)); toast('ล้างแล้ว'); setTimeout(() => location.reload(), 600); } };
  el.querySelector('#csv').onclick = async () => {
    const { data, error } = await db.from('tasks').select('title,detail,status,due_at,submitted_at,created_at,workers(name)').order('created_at');
    if (error) return toast(error.message);
    const f = d => d ? new Date(d).toLocaleString('th-TH') : '', q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = '\ufeff' + [['ชื่องาน', 'รายละเอียด', 'ผู้รับผิดชอบ', 'สถานะ', 'กำหนดเสร็จ', 'เวลาที่เสร็จ', 'สร้างเมื่อ'], ...data.map(t => [t.title, t.detail, t.workers?.name, ST[t.status]?.[0], f(t.due_at), f(t.submitted_at), f(t.created_at)])].map(r => r.map(q).join(',')).join('\n');
    Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: `งานภารโรง-${new Date().toLocaleDateString('sv-SE')}.csv` }).click();
    toast(`ส่งออก ${data.length} งานแล้ว`);
  };
}
