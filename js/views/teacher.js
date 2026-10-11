import { db } from '../db.js';
import { esc, pill, toast, header, sheet, ST } from '../ui.js';
import { ic } from '../icons.js';
const link = (u, l) => u ? ` · <a href="${esc(u)}" target="_blank" rel="noopener" style="color:var(--pri)">${l}</a>` : '';
const loc = d => d ? new Date(new Date(d) - new Date(d).getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : '';

export async function render(el) {
  const [{ data: ws = [] }, { data: ts, error }] = await Promise.all([
    db.from('workers').select('id,name,active'),
    db.from('tasks').select('*,workers(name)').order('created_at', { ascending: false }).limit(100)]);
  if (error) return el.innerHTML = header('ผิดพลาด', esc(error.message));
  const done = (e, m) => { toast(e ? e.message : m); render(el); };
  el.innerHTML = header('งานพิเศษ', 'มอบหมาย แก้ไข และติดตามงาน') + `<div class="g">
    <form id="f" class="f"><input class="in" name="title" placeholder="ชื่องาน" required><input class="in" name="detail" placeholder="รายละเอียด (ถ้ามี)">
    <select class="in" name="worker_id" required>${ws.filter(w => w.active).map(w => `<option value="${w.id}">${esc(w.name)}</option>`).join('')}</select>
    <input class="in" type="datetime-local" name="due_at"><button class="b">มอบหมายงาน</button></form>
    <p class="sec">รายการงานทั้งหมด (${ts.length})</p>` +
    ts.map(t => `<div class="c"><div class="i s-${t.status}">${ic('task')}</div><div class="t">${esc(t.title)}<small>${esc(t.workers?.name || '')}${link(t.photo_before_url, 'ก่อน')}${link(t.photo_after_url, 'หลัง')}</small></div>` +
      (t.status === 'submitted' ? `<button class="p ok" data-a="approved" data-id="${t.id}">อนุมัติ</button><button class="p er" data-a="rejected" data-id="${t.id}">ตีกลับ</button>` : pill(t.status)) +
      `<button class="p" data-m="${t.id}" aria-label="จัดการงาน">${ic('more', 18)}</button></div>`).join('') + `</div>`;
  el.querySelector('#f').onsubmit = async e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    f.due_at ? f.due_at = new Date(f.due_at).toISOString() : delete f.due_at; if (!f.detail) delete f.detail;
    done((await db.from('tasks').insert(f)).error, 'มอบหมายงานแล้ว');
  };
  el.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => done((await db.from('tasks').update({ status: b.dataset.a }).eq('id', b.dataset.id)).error, 'บันทึกแล้ว'));
  el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => edit(ts.find(x => x.id === b.dataset.m)));

  function edit(t) {
    const o = sheet('แก้ไขงาน', `<form id="ef" class="f"><input class="in" name="title" value="${esc(t.title)}" placeholder="ชื่องาน" required><input class="in" name="detail" value="${esc(t.detail || '')}" placeholder="รายละเอียด">
      <select class="in" name="worker_id">${ws.map(w => `<option value="${w.id}" ${w.id === t.worker_id ? 'selected' : ''}>${esc(w.name)}</option>`).join('')}</select>
      <input class="in" type="datetime-local" name="due_at" value="${loc(t.due_at)}">
      <select class="in" name="status">${Object.entries(ST).map(([k, v]) => `<option value="${k}" ${k === t.status ? 'selected' : ''}>${v[0]}</option>`).join('')}</select>
      <button class="b">บันทึกการแก้ไข</button><button type="button" class="b dg" id="rm">ลบงานนี้</button></form>`);
    o.querySelector('#ef').onsubmit = async e => {
      e.preventDefault(); const p = Object.fromEntries(new FormData(e.target));
      p.due_at = p.due_at ? new Date(p.due_at).toISOString() : null; p.detail = p.detail || null;
      if (p.status === 'approved' && !t.submitted_at) p.submitted_at = new Date().toISOString();
      o.remove(); done((await db.from('tasks').update(p).eq('id', t.id)).error, 'แก้ไขแล้ว');
    };
    o.querySelector('#rm').onclick = async () => {
      if (!confirm('ลบงานนี้ถาวร? กู้คืนไม่ได้')) return;
      o.remove(); done((await db.from('tasks').delete().eq('id', t.id)).error, 'ลบงานแล้ว');
    };
  }
}
