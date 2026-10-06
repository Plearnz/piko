# PIKO + ระบบ Admin (Cloudflare Workers)

โครงสร้าง
- public/        หน้าเว็บทั้งหมด (index.html, admin.html, login.html, css, js, pyodide, assets)
- src/worker.js  backend: /api/exercises และ /api/admin/login
- wrangler.jsonc ค่าตั้งของโปรเจกต์ (ชื่อ, KV)

ขั้นตอน
1. Cloudflare -> Storage & Databases -> KV -> Create -> ตั้งชื่ออะไรก็ได้ -> คัดลอก ID (ตัวอักษร+ตัวเลข 32 ตัว)
2. (ใส่ KV ID ใน wrangler.jsonc ให้แล้ว)
3. อัพทุกไฟล์ขึ้น GitHub repo (วางโครงสร้างโฟลเดอร์ให้เหมือนเดิม ให้ wrangler.jsonc อยู่ที่ root ของ repo)
4. Cloudflare -> Workers & Pages -> Create application -> Import a repository -> เลือก repo
   - Project name: piko  (ต้องตรงกับ "name" ใน wrangler.jsonc)
   - Build command: เว้นว่าง / Deploy command: npx wrangler deploy (ค่าเริ่มต้น)
5. หลัง deploy: โปรเจกต์ -> Settings -> Variables and Secrets -> Add -> ชนิด Secret
   ชื่อ ADMIN_PASSWORD ค่า = รหัสผ่าน Admin -> Deploy
6. เปิด https://<ชื่อโปรเจกต์>.<subdomain>.workers.dev/admin

เปลี่ยนรหัสผ่าน: แก้ค่า ADMIN_PASSWORD แล้ว deploy ใหม่ (โทเค็นเก่าใช้ไม่ได้ทันที)
