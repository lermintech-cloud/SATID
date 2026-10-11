// ย่อรูปในเบราว์เซอร์ก่อนอัปโหลด: รูปเต็ม ~1280px + รูปย่อ ~320px
async function shrink(file, maxW, q) {
  const bmp = await createImageBitmap(file); // เบราว์เซอร์สมัยใหม่หมุนรูปตาม EXIF ให้เอง
  const s = Math.min(1, maxW / bmp.width), c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, 'image/jpeg', q));
}
export async function prepPhoto(file, onStep, sizes = [1280, 320]) {
  onStep?.('กำลังปรับขนาดรูป…');
  let full = await shrink(file, sizes[0], 0.7);
  if (full.size > 500000) full = await shrink(file, Math.round(sizes[0] * 0.8), 0.55); // bucket จำกัด 500 KB
  return { full, thumb: await shrink(file, sizes[1], 0.6) };
}
export async function sendPhoto(db, base, full, thumbBlob) {
  const bucket = db.storage.from('task-photos');
  for (const [p, b] of [[`${base}.jpg`, full], [`${base}-t.jpg`, thumbBlob]]) {
    const { error } = await bucket.upload(p, b, { contentType: 'image/jpeg' });
    if (error && !/already exists|duplicate/i.test(error.message)) throw error; // ส่งซ้ำตอนคิวลองใหม่ได้
  }
  return bucket.getPublicUrl(`${base}.jpg`).data.publicUrl;
}
export async function uploadPhoto(db, taskId, kind, file, onStep, sizes) {
  const p = await prepPhoto(file, onStep, sizes); onStep?.('กำลังอัปโหลด… อย่าปิดหน้านี้');
  return sendPhoto(db, `${taskId}/${kind}-${Date.now()}`, p.full, p.thumb);
}
export const thumb = u => (u ? u.replace(/\.jpg$/, '-t.jpg') : '');
