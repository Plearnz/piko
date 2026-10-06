/* PIKO — ข้อกำหนดการใช้งาน และนโยบายความเป็นส่วนตัว
 * เปิดเป็นหน้าต่างทับ: window.PIKO_openLegal('terms' | 'privacy', { onAccept: fn })
 * ภาษาไทย/อังกฤษตามคีย์ localStorage "piko.lang" · แก้เนื้อหาได้ที่ DOCS ด้านล่าง
 */
(function () {
  'use strict';
  var UPDATED = { th: 'ปรับปรุงล่าสุด 7 ตุลาคม 2569', en: 'Last updated 7 October 2026' };
  var CONTACT = { phone: '0986210870', email: 'sutcpe30@gmail.com' };

  var DOCS = {
    th: {
      tabs: { terms: 'ข้อกำหนดการใช้งาน', privacy: 'นโยบายความเป็นส่วนตัว' },
      close: 'ปิด', accept: 'อ่านแล้ว ยอมรับ', dialog: 'ข้อกำหนดและนโยบายของ PIKO',
      terms: [
        ['เกี่ยวกับ PIKO', 'PIKO เป็นเว็บฝึกเขียนโปรแกรมภาษา Python ของสาขาวิชาวิศวกรรมคอมพิวเตอร์ มหาวิทยาลัยเทคโนโลยีสุรนารี ใช้เพื่อการเรียนรู้เท่านั้น การลงทะเบียนและใช้งานถือว่าคุณยอมรับข้อกำหนดนี้'],
        ['บัญชีผู้ใช้', 'ลงทะเบียนด้วยชื่อ-นามสกุลและรหัสนักศึกษาของคุณเอง ห้ามใช้รหัสนักศึกษาของผู้อื่น และเก็บรหัสผ่านไว้เป็นความลับ คุณรับผิดชอบการใช้งานที่เกิดขึ้นภายใต้บัญชีของคุณ'],
        ['การใช้งานที่เหมาะสม', 'ห้ามเขียนหรือรันโค้ดที่ตั้งใจทำลาย รบกวน หรือหลบเลี่ยงการทำงานของระบบ และห้ามใส่ข้อมูลส่วนตัวของผู้อื่นลงในโค้ดหรือคำถามที่ส่งให้ AI Shifu'],
        ['ความซื่อสัตย์ทางวิชาการ', 'ทำแบบฝึกหัดด้วยตัวเอง AI Shifu ทำงานใน "โหมดใบ้ ไม่เฉลย" เพื่อช่วยให้คุณเข้าใจ ไม่ใช่ทำแทน การคัดลอกคำตอบของผู้อื่นหรือให้ผู้อื่นทำแทน ถือเป็นการทุจริตตามระเบียบของมหาวิทยาลัย'],
        ['คำแนะนำจาก AI', 'คำแนะนำจาก AI Shifu อาจผิดพลาดได้ ควรรันและทดสอบโค้ดด้วยตัวเองทุกครั้ง ผลตรวจในแบบฝึกหัดใช้เพื่อการฝึกฝน ไม่ใช่คะแนนอย่างเป็นทางการ เว้นแต่อาจารย์ผู้สอนจะแจ้งเป็นอย่างอื่น'],
        ['ข้อมูลและการให้บริการ', 'บัญชีและความคืบหน้าเก็บไว้ในเบราว์เซอร์ของเครื่องที่คุณใช้ ถ้าล้างข้อมูลเบราว์เซอร์หรือเปลี่ยนเครื่อง ข้อมูลจะหายไปและกู้คืนไม่ได้ PIKO ให้บริการตามสภาพที่เป็นอยู่ และอาจปรับปรุงหรือหยุดให้บริการบางส่วนได้'],
        ['การเปลี่ยนแปลงข้อกำหนด', 'ข้อกำหนดนี้อาจปรับปรุงได้ โดยจะแสดงวันที่ปรับปรุงล่าสุดไว้ด้านบน การใช้งานต่อหลังจากนั้นถือว่าคุณยอมรับฉบับใหม่'],
        ['ติดต่อ', 'สอบถามเพิ่มเติมได้ที่ โทร ' + CONTACT.phone + ' หรืออีเมล ' + CONTACT.email]
      ],
      privacy: [
        ['ข้อมูลที่เก็บ', 'ชื่อ-นามสกุล รหัสนักศึกษา รหัสผ่าน (เก็บเป็นค่าแฮช SHA-256 ไม่เก็บรหัสผ่านจริง) โค้ดที่คุณเขียน ความคืบหน้าแบบฝึกหัด และการตั้งค่า เช่น ภาษาและโหมดมืด'],
        ['เก็บไว้ที่ไหน', 'ข้อมูลทั้งหมดข้างต้นเก็บในเบราว์เซอร์ของเครื่องคุณเท่านั้น (localStorage) ไม่ได้ส่งไปยังเซิร์ฟเวอร์ของ PIKO ผู้ดูแลระบบจึงไม่เห็นข้อมูลนี้'],
        ['เมื่อใช้ AI Shifu', 'เมื่อคุณกดใช้ AI Shifu โค้ดในไฟล์ที่เปิดอยู่ ผลลัพธ์ใน Terminal และคำถามของคุณ จะถูกส่งไปให้ Claude ของ Anthropic ประมวลผลเพื่อสร้างคำตอบ ซึ่งเป็นไปตามนโยบายของ Anthropic อย่าใส่ข้อมูลส่วนตัวที่ไม่จำเป็นลงในโค้ดหรือคำถาม'],
        ['การใช้ข้อมูล', 'PIKO ใช้ข้อมูลเพื่อให้คุณเข้าสู่ระบบ บันทึกความคืบหน้า และแสดงชื่อของคุณบนหน้าเว็บเท่านั้น ไม่นำไปขายหรือเปิดเผยต่อบุคคลอื่น'],
        ['การลบข้อมูล', 'การออกจากระบบไม่ได้ลบบัญชี ถ้าต้องการลบบัญชีและความคืบหน้าทั้งหมด ให้ล้างข้อมูลเว็บไซต์ (site data) ของหน้านี้ในการตั้งค่าเบราว์เซอร์'],
        ['ติดต่อ', 'ถ้ามีคำถามเรื่องข้อมูลส่วนบุคคล ติดต่อ โทร ' + CONTACT.phone + ' หรืออีเมล ' + CONTACT.email]
      ]
    },
    en: {
      tabs: { terms: 'Terms of Use', privacy: 'Privacy Policy' },
      close: 'Close', accept: 'I have read and agree', dialog: 'PIKO terms and policy',
      terms: [
        ['About PIKO', 'PIKO is a Python practice site of the Computer Engineering program, Suranaree University of Technology, for learning only. By registering and using it, you agree to these terms.'],
        ['Your account', 'Register with your own full name and student ID. Do not use another student\'s ID, and keep your password secret. You are responsible for what happens under your account.'],
        ['Acceptable use', 'Do not write or run code meant to damage, disrupt or get around the system, and do not put other people\'s personal data into code or questions sent to AI Shifu.'],
        ['Academic integrity', 'Do the exercises yourself. AI Shifu works in "hints only, no answers" mode to help you understand, not to do the work for you. Copying someone else\'s answer or having someone do it for you is cheating under university rules.'],
        ['AI advice', 'AI Shifu can be wrong. Always run and test your code yourself. Exercise results are for practice, not official grades, unless your instructor says otherwise.'],
        ['Data and service', 'Your account and progress are stored in the browser on the device you use. Clearing browser data or switching devices removes them for good. PIKO is provided as is and may change or stop parts of the service.'],
        ['Changes to these terms', 'These terms may be updated; the date at the top shows the latest version. Continuing to use PIKO means you accept the new version.'],
        ['Contact', 'Questions: phone ' + CONTACT.phone + ' or email ' + CONTACT.email]
      ],
      privacy: [
        ['What we store', 'Your full name, student ID, password (stored as a SHA-256 hash, never the password itself), the code you write, your exercise progress, and settings such as language and dark mode.'],
        ['Where it is stored', 'All of the above stays in your browser on your device (localStorage). It is not sent to a PIKO server, so the site administrators cannot see it.'],
        ['When you use AI Shifu', 'When you use AI Shifu, the code in the open file, the Terminal output and your question are sent to Anthropic\'s Claude to generate a reply, under Anthropic\'s policies. Do not put unnecessary personal data into your code or questions.'],
        ['How data is used', 'PIKO uses your data only to sign you in, save your progress and show your name on the page. It is not sold or shared with anyone.'],
        ['Deleting your data', 'Signing out does not delete your account. To delete your account and all progress, clear this site\'s data in your browser settings.'],
        ['Contact', 'Questions about personal data: phone ' + CONTACT.phone + ' or email ' + CONTACT.email]
      ]
    }
  };

  var CSS = '' +
    '.piko-legal{--lg-bg:#FFFFFF;--lg-ink:#1B2333;--lg-ink2:#4A5263;--lg-line:#EDE3BF;--lg-soft:#FFF7D1;--lg-accent:#8BBEEA;--lg-on:#1B2333;--lg-num:#8B1A2B;' +
    'position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(16,27,45,.55);font-family:"IBM Plex Sans Thai","Noto Sans Thai",Tahoma,sans-serif}' +
    ':root[data-theme="dark"] .piko-legal{--lg-bg:#0D1C42;--lg-ink:#FCF1D0;--lg-ink2:#CFC8B0;--lg-line:#2B4479;--lg-soft:#1A2D5E;--lg-accent:#8BBEEA;--lg-on:#0A1430;--lg-num:#F28B98;background:rgba(0,0,0,.6)}' +
    '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .piko-legal{--lg-bg:#0D1C42;--lg-ink:#FCF1D0;--lg-ink2:#CFC8B0;--lg-line:#2B4479;--lg-soft:#1A2D5E;--lg-accent:#8BBEEA;--lg-on:#0A1430;--lg-num:#F28B98;background:rgba(0,0,0,.6)}}' +
    '.piko-legal .lg-box{width:100%;max-width:680px;max-height:min(86vh,760px);display:flex;flex-direction:column;background:var(--lg-bg);color:var(--lg-ink);border:1px solid var(--lg-line);border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,.3);overflow:hidden}' +
    '.piko-legal .lg-head{display:flex;align-items:center;gap:8px;padding:14px 14px 0 18px}' +
    '.piko-legal .lg-tabs{display:flex;gap:4px;padding:4px;border-radius:12px;background:var(--lg-soft);flex:1 1 auto;min-width:0}' +
    '.piko-legal .lg-tabs button{flex:1 1 0;min-height:40px;border:0;border-radius:9px;background:transparent;color:var(--lg-ink2);font:inherit;font-size:14px;font-weight:600;cursor:pointer;padding:0 8px}' +
    '.piko-legal .lg-tabs button[aria-selected="true"]{background:var(--lg-accent);color:var(--lg-on)}' +
    '.piko-legal .lg-x{flex:0 0 40px;width:40px;height:40px;border:0;border-radius:10px;background:transparent;color:var(--lg-ink2);font-size:22px;line-height:1;cursor:pointer}' +
    '.piko-legal .lg-x:hover{background:var(--lg-soft)}' +
    '.piko-legal .lg-body{overflow:auto;padding:18px 24px 8px;min-height:0}' +
    '.piko-legal h2{margin:0 0 4px;font-family:"Prompt","Anuphan","Noto Sans Thai",sans-serif;font-size:24px;font-weight:600;text-wrap:balance}' +
    '.piko-legal .lg-date{margin:0 0 16px;font-size:13px;color:var(--lg-ink2)}' +
    '.piko-legal ol{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:14px;counter-reset:lg}' +
    '.piko-legal li{display:grid;grid-template-columns:28px 1fr;gap:2px 10px;counter-increment:lg}' +
    '.piko-legal li::before{content:counter(lg);grid-row:span 2;width:26px;height:26px;border-radius:999px;background:var(--lg-soft);color:var(--lg-num);font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center}' +
    '.piko-legal li b{font-size:15px}' +
    '.piko-legal li p{margin:0;font-size:14.5px;line-height:1.75;color:var(--lg-ink2);max-width:62ch}' +
    '.piko-legal .lg-foot{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;padding:12px 18px 16px;border-top:1px solid var(--lg-line)}' +
    '.piko-legal .lg-foot button{min-height:44px;padding:0 18px;border-radius:12px;font:inherit;font-weight:600;font-size:15px;cursor:pointer}' +
    '.piko-legal .lg-close{border:1px solid var(--lg-line);background:transparent;color:var(--lg-ink)}' +
    '.piko-legal .lg-accept{border:0;background:var(--lg-accent);color:var(--lg-on)}' +
    '.piko-legal button:focus-visible{outline:3px solid var(--lg-accent);outline-offset:2px}' +
    '@media (max-width:560px){.piko-legal{padding:0;align-items:flex-end}.piko-legal .lg-box{max-height:92vh;border-radius:20px 20px 0 0}.piko-legal .lg-body{padding:16px 18px 8px}}';

  function lang() { try { return localStorage.getItem('piko.lang') === 'en' ? 'en' : 'th'; } catch (e) { return 'th'; } }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  var root = null, lastFocus = null, current = 'terms', opts = {};

  function render() {
    var L = lang(), D = DOCS[L];
    root.setAttribute('lang', L);
    root.querySelector('.lg-box').setAttribute('aria-label', D.dialog);
    root.querySelectorAll('.lg-tabs button').forEach(function (b) {
      var k = b.getAttribute('data-doc');
      b.textContent = D.tabs[k];
      b.setAttribute('aria-selected', k === current ? 'true' : 'false');
      b.tabIndex = k === current ? 0 : -1;
    });
    var body = root.querySelector('.lg-body');
    body.innerHTML = '<h2 id="lg-title">' + esc(D.tabs[current]) + '</h2><p class="lg-date">' + esc(UPDATED[L]) + '</p><ol>' +
      D[current].map(function (s) { return '<li><b>' + esc(s[0]) + '</b><p>' + esc(s[1]) + '</p></li>'; }).join('') + '</ol>';
    body.scrollTop = 0;
    root.querySelector('.lg-close').textContent = D.close;
    var acc = root.querySelector('.lg-accept');
    acc.textContent = D.accept; acc.hidden = !opts.onAccept;
  }
  function build() {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    root = document.createElement('div');
    root.className = 'piko-legal'; root.hidden = true;
    root.innerHTML = '<div class="lg-box" role="dialog" aria-modal="true" aria-labelledby="lg-title">' +
      '<div class="lg-head"><div class="lg-tabs" role="tablist"><button type="button" role="tab" data-doc="terms"></button><button type="button" role="tab" data-doc="privacy"></button></div>' +
      '<button type="button" class="lg-x" aria-label="×">×</button></div>' +
      '<div class="lg-body" tabindex="0"></div>' +
      '<div class="lg-foot"><button type="button" class="lg-close"></button><button type="button" class="lg-accept"></button></div></div>';
    document.body.appendChild(root);
    root.addEventListener('click', function (e) { if (e.target === root) close(); });
    root.querySelector('.lg-x').addEventListener('click', close);
    root.querySelector('.lg-close').addEventListener('click', close);
    root.querySelector('.lg-accept').addEventListener('click', function () { var f = opts.onAccept; close(); if (f) f(); });
    root.querySelectorAll('.lg-tabs button').forEach(function (b) {
      b.addEventListener('click', function () { current = b.getAttribute('data-doc'); render(); b.focus(); });
    });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && e.target.getAttribute('role') === 'tab') {
        current = current === 'terms' ? 'privacy' : 'terms'; render(); root.querySelector('[data-doc="' + current + '"]').focus();
      }
      if (e.key === 'Tab') { // เก็บโฟกัสไว้ในหน้าต่าง
        var f = Array.prototype.filter.call(root.querySelectorAll('button, [tabindex="0"]'), function (x) { return !x.hidden && x.tabIndex >= 0; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }
  function open(doc, o) {
    if (!root) build();
    current = doc === 'privacy' ? 'privacy' : 'terms';
    opts = o || {};
    lastFocus = document.activeElement;
    render();
    root.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    root.querySelector('[data-doc="' + current + '"]').focus();
  }
  function close() {
    if (!root || root.hidden) return;
    root.hidden = true;
    document.documentElement.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  window.PIKO_openLegal = open;

  // ลิงก์ใดๆ ที่มี data-legal="terms|privacy" จะเปิดหน้าต่างนี้ (ใส่ data-legal-accept="#id" เพื่อให้มีปุ่มยอมรับ)
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-legal]');
    if (!a) return;
    e.preventDefault();
    var sel = a.getAttribute('data-legal-accept'); // เช่น "#reg-terms": ปุ่ม "อ่านแล้ว ยอมรับ" จะติ๊กช่องนี้ให้
    open(a.getAttribute('data-legal'), sel ? { onAccept: function () {
      var c = document.querySelector(sel); if (!c) return;
      c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true }));
      var err = document.getElementById('err-' + c.id); if (err) err.textContent = '';
      c.setAttribute('aria-invalid', 'false'); c.focus();
    } } : null);
  });
})();
