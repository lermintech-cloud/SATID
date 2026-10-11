// ย่อรูปในเบราว์เซอร์ก่อนอัปโหลด: รูปเต็ม ~1280px + รูปย่อ ~320px
async function shrink(file, maxW, q) {
  const bmp = await createImageBitmap(file); // เบราว์เซอร์สมัยใหม่หมุนรูปตาม EXIF ให้เอง
  const s = Math.min(1, maxW / bmp.width), c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, 'image/jpeg', q));
}
export async function uploadPhoto(db, taskId, kind, file, onStep, sizes = [1280, 320]) {
  const base = `${taskId}/${kind}-${Date.now()}`, bucket = db.storage.from('task-photos');
  onStep?.('กำลังปรับขนาดรูป…');
  let full = await shrink(file, sizes[0], 0.7);
  if (full.size > 500000) full = await shrink(file, 1024, 0.55); // bucket จำกัด 500 KB
  const thumbBlob = await shrink(file, sizes[1], 0.6);
  onStep?.('กำลังอัปโหลด… อย่าปิดหน้านี้');
  for (const [p, b] of [[`${base}.jpg`, full], [`${base}-t.jpg`, thumbBlob]]) {
    const { error } = await bucket.upload(p, b, { contentType: 'image/jpeg' });
    if (error) throw error;
  }
  return bucket.getPublicUrl(`${base}.jpg`).data.publicUrl;
}
export const thumb = u => (u ? u.replace(/\.jpg$/, '-t.jpg') : '');
