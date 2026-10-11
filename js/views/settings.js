import { db } from '../db.js';
import { esc, toast, header, ST } from '../ui.js';
import { ic } from '../icons.js';
import { install, canInstall, installed, isIOS } from '../install.js';
const VERSION = '2.0';
const SAMPLES = ['เปิดประตูโรงเรียน', 'กวาดลานหน้าเสาธง', 'ทำความสะอาดห้องน้ำ', 'เก็บขยะทั่วบริเวณ', 'รดน้ำต้นไม้', 'เช็ดถูทางเดินอาคารเรียน', 'ตรวจก๊อกน้ำและไฟฟ้า', 'เติมสบู่และกระดาษชำระ', 'เปิด-ปิดไฟส่วนกลาง', 'ปิดไฟ ล็อกประตูห้อง'];
const sw = (k, on) => `<button type="button" class="swt ${on ? 'on' : ''}" role="switch" aria-checked="${!!on}" data-sw="${k}"><i></i></button>`;
const row = (i, t, s, right = '') => `<div class="c"><div class="i">${ic(i, 20)}</div><div class="t">${t}<small>${s}</small></div>${right}</div>`;
const btn = (id, label, cls = 'on') => `<button class="p ${cls}" id="${id}" type="button">${label}</button>`;
const gate = (title, sub, extra = '') => header('ตั้งค่า', 'ส่วนนี้ป้องกันด้วย PIN') + `<div class="g"><form id="pf" class="f"><b style="text-align:center">${title}</b><small style="text-align:center;color:var(--mut)">${sub}</small>
  <input class="in" id="p1" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="PIN" required style="text-align:center;font-size:22px;letter-spacing:6px">${extra}<button class="b">ยืนยัน</button></form></div>`;

export async function render(el) {
  const st = await db.rpc('pin_status');
  if (st.error) return el.innerHTML = header('ตั้งค่า', '') + `<div class="g"><div class="c" style="display:block"><b>ยังใช้งานไม่ได้</b><br><small>${esc(st.error.message)}<br>รัน sql/secure.sql ใน Supabase ให้ครบก่อน</small></div></div>`;
  if (!st.data?.set) {
    el.innerHTML = gate('ตั้ง PIN ครั้งแรก', 'ตัวเลข 4-8 หลัก ใช้เข้าหน้าตั้งค่า (จำไว้ให้ดี)', '<input class="in" id="p2" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="ยืนยัน PIN อีกครั้ง" required style="text-align:center;font-size:22px;letter-spacing:6px">');
    el.querySelector('#pf').onsubmit = async e => {
      e.preventDefault(); const p = el.querySelector('#p1').value;
      if (p !== el.querySelector('#p2').value) return toast('PIN สองช่องไม่ตรงกัน');
      const { error } = await db.rpc('pin_set', { new_pin: p }); if (error) return toast(error.message);
      sessionStorage.setItem('pin', p); toast('ตั้ง PIN แล้ว'); render(el);
    };
    return;
  }
  const pin = sessionStorage.getItem('pin');
  if (pin) { const g = await db.rpc('settings_get', { p: pin }); if (!g.error) return panel(el, pin, g.data); sessionStorage.removeItem('pin'); }
  el.innerHTML = gate('ใส่ PIN เพื่อเข้าตั้งค่า', 'ผิดเกิน 5 ครั้งจะถูกล็อก 10 นาที');
  el.querySelector('#pf').onsubmit = async e => {
    e.preventDefault(); const p = el.querySelector('#p1').value, g = await db.rpc('settings_get', { p });
    if (g.error) return toast(g.error.message);
    sessionStorage.setItem('pin', p); panel(el, p, g.data);
  };
}

async function panel(el, pin, S) {
  const { data: rt = [] } = await db.from('routines').select('*').eq('active', true).order('sort').order('created_at');
  const on = k => (S[k] ?? (k === 'tg_pending' || k === 'tg_routine' ? '1' : '0')) === '1', rts = rt ?? [];
  el.innerHTML = header('ตั้งค่า', 'ควบคุมระบบทั้งหมด') + `<div class="g">
    <p class="sec">แจ้งเตือน Telegram</p>
    <form id="tg" class="f">
      <input class="in" name="tg_token" type="password" autocomplete="off" placeholder="${S.tg_token_set ? 'Bot token ตั้งไว้แล้ว (เว้นว่างเพื่อใช้ค่าเดิม)' : 'Bot token จาก @BotFather'}">
      <input class="in" name="tg_chat_id" value="${esc(S.tg_chat_id || '')}" placeholder="Group / Chat ID เช่น -1001234567890">
      <div class="rowf"><input class="in" type="time" name="tg_time1" value="${esc(S.tg_time1 || '07:30')}"><input class="in" type="time" name="tg_time2" value="${esc(S.tg_time2 || '15:30')}"></div>
      ${row('send', 'เปิดการส่งอัตโนมัติ', 'ส่งตามเวลาสองรอบด้านบน', sw('tg_enabled', on('tg_enabled')))}
      ${row('task', 'แจ้ง งานค้าง', 'รายการงานที่ยังไม่เสร็จ', sw('tg_pending', on('tg_pending')))}
      ${row('list', 'แจ้ง งานประจำวัน', 'ที่ยังไม่ได้ติ๊ก', sw('tg_routine', on('tg_routine')))}
      <button class="b">บันทึกการตั้งค่า</button>
      <div class="rowf">${btn('tt', 'ส่งข้อความทดสอบ')}${btn('tn', 'ส่งสรุปตอนนี้', '')}</div>
    </form>
    <p class="sec">จัดการงานประจำวัน (${rts.length})</p>` +
    rts.map(r => `<div class="c"><div class="t">${esc(r.title)}</div><button class="p" data-ed="${r.id}">${ic('pen', 16)} แก้</button><button class="p er" data-rm="${r.id}">${ic('trash', 16)} ลบ</button></div>`).join('') +
    `<form id="rf" class="rowf"><input class="in" name="title" placeholder="เพิ่มรายการงานประจำ" required><button class="p on" style="min-height:52px;padding:0 18px">${ic('plus', 16)} เพิ่ม</button></form>${btn('sm', 'เพิ่มตัวอย่าง 10 รายการ', '')}
    <p class="sec">ความปลอดภัย</p>
    <form id="cp" class="f"><input class="in" name="o" type="password" inputmode="numeric" maxlength="8" placeholder="PIN เดิม" required><input class="in" name="n" type="password" inputmode="numeric" maxlength="8" placeholder="PIN ใหม่ 4-8 หลัก" required><button class="b o">เปลี่ยน PIN</button></form>
    ${row('shield', 'ล็อกหน้าตั้งค่า', 'ต้องใส่ PIN ใหม่เมื่อเข้าอีกครั้ง', btn('lk', 'ล็อก', 'er'))}
    <p class="sec">การใช้งาน</p>` +
    row('bell', 'เด้งแจ้งเตือนครั้งแรกของวัน', 'เมื่อเปิดแอปครั้งแรกของแต่ละวัน', sw('auto', localStorage.getItem('notifAuto') !== '0')) +
    (installed() ? row('ok', 'ติดตั้งแล้ว', 'กำลังใช้งานแบบแอป') : canInstall() ? row('download', 'ติดตั้งแอปลงเครื่อง', 'เปิดได้จากหน้าจอโฮม', btn('inst', 'ติดตั้ง')) : row('download', isIOS ? 'ติดตั้งบน iPhone' : 'ติดตั้งแอป', isIOS ? 'แตะปุ่มแชร์ แล้วเลือก เพิ่มไปยังหน้าจอโฮม' : 'เปิดเมนูเบราว์เซอร์ แล้วเลือก ติดตั้งแอป')) +
    row('download', 'ส่งออกรายการงาน (CSV)', 'เปิดด้วย Excel ได้', btn('csv', 'ส่งออก')) +
    row('refresh', 'อัปเดตแอป / ล้างแคช', 'ใช้เมื่ออัปเดตแล้วหน้าตาไม่เปลี่ยน', btn('upd', 'ทำเลย')) +
    row('trash', 'ล้างข้อมูลที่จำในเครื่องนี้', 'ชื่อภารโรงที่เลือกไว้และค่าในเครื่อง', btn('clr', 'ล้าง', 'er')) +
    row('info', `ระบบนักการภารโรง v${VERSION}`, 'พัฒนาโดย ครูเฉลิมพล จันทร์แดง · โรงเรียนบ้านไร่') + `</div>`;
  const again = (error, m) => { toast(error ? error.message : m); render(el); };
  el.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => { const v = !b.classList.contains('on'); b.classList.toggle('on', v); b.setAttribute('aria-checked', v); if (b.dataset.sw === 'auto') localStorage.setItem('notifAuto', v ? '1' : '0'); });
  const vals = () => { const f = Object.fromEntries(new FormData(el.querySelector('#tg'))); ['tg_enabled', 'tg_pending', 'tg_routine'].forEach(k => f[k] = el.querySelector(`[data-sw=${k}]`).classList.contains('on') ? '1' : '0'); f.tg_chat_id = f.tg_chat_id.trim(); f.tg_token = f.tg_token.trim(); return f; };
  const save = async () => (await db.rpc('settings_save', { p: pin, vals: vals() })).error;
  el.querySelector('#tg').onsubmit = async e => { e.preventDefault(); const er = await save(); toast(er ? er.message : 'บันทึกแล้ว'); };
  el.querySelector('#tt').onclick = async () => {
    let er = await save(); if (er) return toast(er.message);
    const r = await db.rpc('telegram_test', { p: pin }); if (r.error) return toast(r.error.message);
    toast('กำลังส่งข้อความทดสอบ…'); await new Promise(x => setTimeout(x, 2500));
    const q = await db.rpc('telegram_result', { p: pin, rid: r.data }); const s = q.data?.status;
    toast(q.error ? q.error.message : s === 200 ? 'ส่งสำเร็จ ตรวจใน Telegram ได้เลย' : s ? `Telegram ตอบกลับ ${s}: ${q.data.body}` : 'ยังไม่ได้ผลตอบกลับ ลองกดตรวจอีกครั้งในสักครู่');
  };
  el.querySelector('#tn').onclick = async () => { let er = await save(); if (!er) er = (await db.rpc('reminders_now', { p: pin })).error; toast(er ? er.message : 'สั่งส่งสรุปแล้ว ตรวจใน Telegram'); };
  el.querySelector('#rf').onsubmit = async e => { e.preventDefault(); again((await db.from('routines').insert({ title: new FormData(e.target).get('title').trim(), sort: rts.length + 1 })).error, 'เพิ่มรายการแล้ว'); };
  el.querySelector('#sm').onclick = async () => { const have = new Set(rts.map(r => r.title)), rows = SAMPLES.filter(t => !have.has(t)).map((title, i) => ({ title, sort: rts.length + i + 1 })); rows.length ? again((await db.from('routines').insert(rows)).error, `เพิ่มตัวอย่าง ${rows.length} รายการ`) : toast('มีตัวอย่างครบแล้ว'); };
  el.querySelectorAll('[data-ed]').forEach(x => x.onclick = async () => { const r = rts.find(y => y.id === x.dataset.ed), v = prompt('แก้ชื่อรายการ', r.title)?.trim(); if (v) again((await db.from('routines').update({ title: v }).eq('id', r.id)).error, 'แก้ไขแล้ว'); });
  el.querySelectorAll('[data-rm]').forEach(x => x.onclick = async () => { if (confirm('ลบรายการนี้ออกจากงานประจำ?')) again((await db.from('routines').update({ active: false }).eq('id', x.dataset.rm)).error, 'ลบแล้ว'); });
  el.querySelector('#cp').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target), r = await db.rpc('pin_set', { new_pin: f.get('n'), old_pin: f.get('o') }); if (r.error) return toast(r.error.message); if (!r.data) return toast('PIN เดิมไม่ถูกต้อง'); sessionStorage.setItem('pin', f.get('n')); toast('เปลี่ยน PIN แล้ว'); e.target.reset(); };
  el.querySelector('#lk').onclick = () => { sessionStorage.removeItem('pin'); render(el); };
  el.querySelector('#inst')?.addEventListener('click', async () => { if (await install()) render(el); });
  el.querySelector('#upd').onclick = async () => { (await navigator.serviceWorker?.getRegistrations?.() ?? []).forEach(x => x.unregister()); (await caches?.keys?.() ?? []).forEach(k => caches.delete(k)); toast('ล้างแคชแล้ว กำลังโหลดใหม่…'); setTimeout(() => location.reload(), 800); };
  el.querySelector('#clr').onclick = () => { if (confirm('ล้างข้อมูลที่จำไว้ในเครื่องนี้?')) { Object.keys(localStorage).forEach(k => localStorage.removeItem(k)); toast('ล้างแล้ว'); setTimeout(() => location.reload(), 600); } };
  el.querySelector('#csv').onclick = async () => {
    const { data, error } = await db.from('tasks').select('title,detail,status,due_at,submitted_at,created_at,workers(name)').order('created_at');
    if (error) return toast(error.message);
    const f = d => d ? new Date(d).toLocaleString('th-TH') : '', q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = '\ufeff' + [['ชื่องาน', 'รายละเอียด', 'ผู้รับผิดชอบ', 'สถานะ', 'กำหนดเสร็จ', 'เวลาที่เสร็จ', 'สร้างเมื่อ'], ...data.map(t => [t.title, t.detail, t.workers?.name, ST[t.status]?.[0], f(t.due_at), f(t.submitted_at), f(t.created_at)])].map(r => r.map(q).join(',')).join('\n');
    Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: `งานภารโรง-${new Date().toLocaleDateString('sv-SE')}.csv` }).click();
    toast(`ส่งออก ${data.length} งานแล้ว`);
  };
}
