// ตัวปรับรูปโปรไฟล์: ลากเพื่อเลื่อน / บีบนิ้วหรือใช้แถบเพื่อย่อ-ขยาย แล้วตัดเป็นรูปจัตุรัสก่อนอัปโหลด
import { sheet } from './ui.js';
const OUT = [512, 160], BG = '#E3F4F1';

async function render(bmp, k, view) { // วาดส่วนที่เห็นในกรอบลง canvas ขนาด k px
  const c = document.createElement('canvas'); c.width = c.height = k;
  const g = c.getContext('2d'), r = k / view.V;
  g.fillStyle = BG; g.fillRect(0, 0, k, k);
  g.drawImage(bmp, view.ox * r, view.oy * r, bmp.width * view.s * r, bmp.height * view.s * r);
  return c;
}
const blob = (c, q) => new Promise(r => c.toBlob(r, 'image/jpeg', q));

// source: File | Blob  → { full, thumb } หรือ null ถ้ายกเลิก
export async function cropPhoto(source) {
  const bmp = await createImageBitmap(source), url = URL.createObjectURL(source);
  const V = Math.max(200, Math.min(300, innerWidth - 64)), iw = bmp.width, ih = bmp.height;
  const cover = Math.max(V / iw, V / ih), contain = Math.min(V / iw, V / ih), smin = Math.min(contain, cover) * 0.9, smax = cover * 4;
  const st = { s: cover, ox: (V - iw * cover) / 2, oy: (V - ih * cover) / 2, V };
  return new Promise(resolve => {
    const o = sheet('ปรับรูปโปรไฟล์', `<div class="crop" style="width:${V}px;height:${V}px"><img src="${url}" alt="" draggable="false" width="${iw}" height="${ih}"><i class="crop-m"></i></div>
      <p class="crop-h">ลากเพื่อเลื่อนรูป · บีบนิ้วหรือเลื่อนแถบเพื่อย่อ/ขยาย</p>
      <div class="crop-z"><span>ย่อ</span><input type="range" min="${smin}" max="${smax}" step="any" value="${cover}" aria-label="ย่อ/ขยาย"><span>ขยาย</span></div>
      <button class="b" id="cs">ใช้รูปนี้</button><button class="b o" id="cr" type="button">คืนค่าเดิม</button>`);
    const box = o.querySelector('.crop'), img = box.querySelector('img'), rng = o.querySelector('input[type=range]');
    let done = false;
    const finish = v => { if (done) return; done = true; URL.revokeObjectURL(url); o.remove(); resolve(v); };
    const clamp = () => {
      const w = iw * st.s, h = ih * st.s;
      st.ox = w >= V ? Math.min(0, Math.max(V - w, st.ox)) : Math.min(V - w, Math.max(0, st.ox));
      st.oy = h >= V ? Math.min(0, Math.max(V - h, st.oy)) : Math.min(V - h, Math.max(0, st.oy));
    };
    const paint = () => { clamp(); img.style.transform = `translate(${st.ox}px,${st.oy}px) scale(${st.s})`; rng.value = st.s; };
    const zoomTo = (s, cx = V / 2, cy = V / 2) => { // ซูมโดยให้จุด (cx,cy) อยู่กับที่
      s = Math.min(smax, Math.max(smin, s)); const f = s / st.s;
      st.ox = cx - (cx - st.ox) * f; st.oy = cy - (cy - st.oy) * f; st.s = s; paint();
    };
    const pts = new Map(); let d0 = 0, s0 = 1;
    const pos = e => { const r = box.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    box.onpointerdown = e => { box.setPointerCapture(e.pointerId); pts.set(e.pointerId, pos(e)); if (pts.size === 2) { const [a, b] = [...pts.values()]; d0 = Math.hypot(a[0] - b[0], a[1] - b[1]); s0 = st.s; } };
    box.onpointermove = e => {
      if (!pts.has(e.pointerId)) return;
      const p = pos(e), q = pts.get(e.pointerId);
      if (pts.size === 1) { st.ox += p[0] - q[0]; st.oy += p[1] - q[1]; pts.set(e.pointerId, p); paint(); }
      else {
        pts.set(e.pointerId, p); const [a, b] = [...pts.values()];
        zoomTo(s0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / (d0 || 1), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      }
    };
    box.onpointerup = box.onpointercancel = e => { pts.delete(e.pointerId); const l = [...pts]; if (l.length === 1) pts.set(l[0][0], l[0][1]); };
    box.onwheel = e => { e.preventDefault(); const [x, y] = pos(e); zoomTo(st.s * (e.deltaY < 0 ? 1.08 : 1 / 1.08), x, y); };
    rng.oninput = () => zoomTo(+rng.value);
    o.querySelector('#cr').onclick = () => { st.s = cover; st.ox = (V - iw * cover) / 2; st.oy = (V - ih * cover) / 2; paint(); };
    o.addEventListener('click', e => { if (e.target === o || e.target.closest('.x2')) finish(null); });
    o.querySelector('#cs').onclick = async () => {
      let c = await render(bmp, OUT[0], st), full = await blob(c, 0.8);
      if (full.size > 500000) full = await blob(c, 0.6); // bucket จำกัด 500 KB
      finish({ full, thumb: await blob(await render(bmp, OUT[1], st), 0.7) });
    };
    paint();
  });
}
