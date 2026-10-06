# PIKO + บัญชีกลาง + ระบบ Admin (Cloudflare Workers + D1)

โครงสร้าง
- public/        หน้าเว็บทั้งหมด (index.html, admin.html, login.html, css, js, pyodide, assets)
- src/worker.js  backend: สมัคร/ล็อกอิน, ซิงก์ความคืบหน้า, โจทย์, Admin
- wrangler.jsonc ค่าตั้งของโปรเจกต์ (ชื่อ, ฐานข้อมูล D1)

ตั้งค่า
1. D1: Storage & Databases -> D1 -> Create database -> คัดลอก Database ID ใส่ใน wrangler.jsonc (ใส่แล้ว)
2. Secret: โปรเจกต์ piko -> Settings -> Variables and Secrets -> Add -> ชนิด Secret
   ชื่อ ADMIN_PASSWORD ค่า = รหัสผ่าน Admin (ตั้งไว้แล้วถ้าเคยทำ ไม่ต้องทำซ้ำ)
3. ตารางในฐานข้อมูลสร้างเองอัตโนมัติ

ใช้งาน
- นักศึกษา: สมัคร/ล็อกอินด้วยรหัสนักศึกษา ความคืบหน้าตามไปทุกเครื่อง
- Admin: https://<โปรเจกต์>.workers.dev/admin  -> แก้โจทย์, ดูรายชื่อนักศึกษา, รีเซ็ตรหัสผ่าน
