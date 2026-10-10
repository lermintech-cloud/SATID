# ระบบนักการภารโรง · โรงเรียนบ้านไร่

PWA (HTML + CSS + JavaScript ES modules) + Supabase ไม่ต้อง build

## โครงสร้าง
- `index.html` หน้าเปลือก · `css/style.css` สไตล์ทั้งหมด
- `js/config.js` ค่าเชื่อม Supabase (**แก้ URL ที่นี่ที่เดียว**)
- `js/app.js` เลือกบทบาท · `js/views/` หน้าของภารโรง/ครู/ผอ. (แก้ทีละบทบาท)
- `sql/policies.sql` สิทธิ์ข้อมูล · `sw.js` + `manifest.webmanifest` ติดตั้งลงมือถือ

## รันในเครื่อง
`python3 -m http.server 8000` แล้วเปิด http://localhost:8000 (เปิดไฟล์ตรงๆ ไม่ได้ เพราะใช้ ES modules)

## ขึ้น GitHub Pages
Push ขึ้น repo > Settings > Pages > Deploy from branch > main / root

## ข้อควรระวัง
`sql/policies.sql` เปิดให้ทุกคนที่มีลิงก์อ่าน/เขียนงานได้ ใช้ช่วงทดลองเท่านั้น ต้องเพิ่ม PIN ก่อนใช้ข้อมูลจริง
