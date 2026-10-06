/* PIKO — สลับภาษา ไทย / English
 * แปลข้อความบนหน้าเว็บจากไทยเป็นอังกฤษตอนแสดงผล (ไม่แตะโค้ดของผู้เรียน ผลลัพธ์โปรแกรม หรือช่องพิมพ์)
 * ภาษาเก็บในคีย์ localStorage "piko.lang" (ใช้ร่วมกับหน้าเข้าสู่ระบบ)
 * เพิ่มคำแปลใหม่: ใส่ใน DICT (ข้อความตรงตัว) หรือ PATTERNS (ข้อความที่มีตัวเลข/ชื่อไฟล์ปน)
 */
(function () {
  'use strict';
  var LANG_KEY = 'piko.lang';

  var DICT = {
    // ส่วนหัว / ทั่วไป
    'ข้ามไปเนื้อหา': 'Skip to content',
    'เมนูหลัก': 'Main menu',
    'หน้าแรก': 'Home',
    'แบบฝึกหัด': 'Exercises',
    'ออกจากระบบ': 'Sign out',
    'ตราสาขาวิชาวิศวกรรมคอมพิวเตอร์ (CPE)': 'Computer Engineering (CPE) emblem',
    'สลับโหมดมืด/สว่าง': 'Switch dark/light mode',
    'เปลี่ยนเป็นโหมดมืด': 'Switch to dark mode',
    'เปลี่ยนเป็นโหมดสว่าง': 'Switch to light mode',
    'โหมดมืด': 'Dark mode',
    'ภาษา': 'Language',
    'ติดต่อสอบถาม · โทร:': 'Contact · Phone:',
    '· อีเมล:': '· Email:',
    'ลงทะเบียน / เข้าสู่ระบบ PIKO': 'PIKO register / sign in',
    'ข้อกำหนดการใช้งาน': 'Terms of Use',
    'นโยบายความเป็นส่วนตัว': 'Privacy Policy',

    // หน้าแรก
    'คุณจะ': 'You have ',
    'ยังไม่': 'not yet',
    'ล้มเหลว': ' failed',
    'จนกว่าคุณจะ…': 'until you…',
    'ล้มเลิกความพยายาม': 'give up trying',
    'พื้นที่เขียนโค้ดอิสระ มี AI Shifu คอยแนะนำ': 'A free coding space, with AI Shifu to guide you',
    'ไปที่ Sandbox →': 'Go to Sandbox →',
    'ข้อ 4 · FizzBuzz': 'Exercise 4 · FizzBuzz',
    'หาร 3 ลงตัวคืน "Fizz" · หาร 5 ลงตัวคืน "Buzz"': 'Divisible by 3 → "Fizz" · by 5 → "Buzz"',
    'ผลการตรวจ': 'Results',
    'ง่าย · กลาง · ยาก': 'Easy · Medium · Hard',
    'โจทย์เรียงตามระดับ ง่าย · กลาง · ยาก': 'Problems sorted by level: easy · medium · hard',
    'ดูแบบฝึกหัดทั้งหมด →': 'See all exercises →',
    'ทำต่อจากที่ค้างไว้': 'Continue where you left off',
    'เริ่มต้นที่ข้อแรก': 'Start with the first exercise',
    'ความคืบหน้าแบบฝึกหัด': 'Exercise progress',
    'ทำต่อเลย': 'Continue',
    'เริ่มเลย': 'Start',
    'ทำครบแล้ว': 'All done',
    'ทบทวนอีกครั้ง': 'Review again',
    'เริ่มข้อแรกกันเลย': "Let's start the first one",
    'ทำครบทุกข้อแล้ว เก่งมาก!': 'All exercises done. Great work!',
    'อีกนิดเดียวก็ครบแล้ว': 'Almost there',
    'ค่อยๆ ทำไปทีละข้อนะ': 'Take it one exercise at a time',
    'กำลังทำ': 'Current',

    // Sandbox
    'กำลังเตรียม Python…': 'Preparing Python…',
    'Python พร้อมใช้งาน': 'Python ready',
    'โหลด Python ไม่สำเร็จ': 'Python failed to load',
    'ตรวจโค้ดด้วย AI': 'Check code with AI',
    'ไฟล์': 'Files',
    'ตัวแก้ไขโค้ด (กด Esc แล้ว Tab เพื่อออก)': 'Code editor (press Esc then Tab to leave)',
    'ปิดคำแนะนำ': 'Close tip',
    'เปิดไฟล์': 'Open file',
    'บันทึก .py': 'Save .py',
    'ลากไฟล์ .py มาวางเพื่อเปิดได้': 'Drop a .py file here to open it',
    'แก้ชื่อไฟล์': 'Rename file',
    'ปิดไฟล์': 'Close file',
    'ไฟล์ใหม่': 'New file',
    'สร้างไฟล์ใหม่': 'Create a new file',
    'ชื่อไฟล์ใหม่': 'New file name',
    'ปิด?': 'Close?',
    'เปิดได้เฉพาะไฟล์ .py หรือ .txt': 'Only .py or .txt files can be opened',
    'กำลังมีหน้าต่างบันทึกเปิดอยู่ ลองใหม่อีกครั้ง': 'A save dialog is already open. Try again',
    'บันทึกไฟล์ไม่สำเร็จในหน้านี้': 'Could not save the file on this page',
    'รัน': 'Run',
    'ล้าง Terminal': 'Clear Terminal',
    'ผลลัพธ์ Terminal': 'Terminal output',
    'พิมพ์ค่าที่ input() ขอได้ในนี้เลย': 'Type the values input() asks for right here',
    'พิมพ์ค่าสำหรับ input() แล้วกด Enter': 'Type a value for input() and press Enter',
    'Python Sandbox — เขียนโค้ดทางซ้ายแล้วกด รัน หรือ F5': 'Python Sandbox — write code on the left, then press Run or F5',
    'กำลังโหลด Python ครั้งแรก อาจใช้เวลาสักครู่…': 'Loading Python for the first time, this may take a moment…',
    'โหลด Python ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่': 'Python failed to load. Check your internet connection and try again',
    '… (ผลลัพธ์ยาวเกินไป ตัดส่วนที่เหลือ)': '… (output too long, the rest was cut)',
    'รอรับ input': 'Waiting for input',
    'หมดเวลา': 'Timed out',
    'มีข้อผิดพลาด': 'Error',
    'พร้อม': 'Ready',
    'กำลังรัน…': 'Running…',
    'เสร็จแล้ว': 'Done',

    // คำแนะนำเมื่อเกิด error
    'ชื่อตัวแปรหรือฟังก์ชันนี้ยังไม่ถูกสร้าง ลองเช็กการสะกด หรือประกาศก่อนใช้งาน': 'This variable or function name has not been defined yet. Check the spelling, or define it before using it',
    'ไวยากรณ์ผิด ลองเช็กวงเล็บ เครื่องหมาย : หรือเครื่องหมายคำพูดให้ครบคู่': 'Syntax error. Check that brackets, colons (:) and quotes are complete',
    'การย่อหน้าไม่ถูกต้อง ใช้ช่องว่าง 4 ช่องให้เท่ากันในบล็อกเดียวกัน': 'Wrong indentation. Use the same 4 spaces for every line in a block',
    'ปนกันระหว่าง Tab กับช่องว่าง ให้ใช้ช่องว่าง 4 ช่องอย่างเดียว': 'Tabs and spaces are mixed. Use 4 spaces only',
    'ชนิดข้อมูลไม่ตรงกัน เช่น นำ str มาบวกกับ int ลองแปลงด้วย int() หรือ str()': 'Type mismatch, e.g. adding a str to an int. Convert with int() or str()',
    'ค่าที่ได้รับไม่ถูกต้อง เช่น int("abc") แปลงเป็นตัวเลขไม่ได้': 'Invalid value, e.g. int("abc") cannot become a number',
    'หารด้วยศูนย์ไม่ได้ ตรวจตัวหารก่อนหาร': 'Cannot divide by zero. Check the divisor first',
    'ตำแหน่ง (index) เกินขนาดของลิสต์หรือสตริง': 'Index is out of range for the list or string',
    'ไม่มี key นี้ใน dict ลองใช้ .get() หรือเช็กด้วย in ก่อน': 'This key is not in the dict. Use .get() or check with "in" first',
    'ข้อมูลชนิดนี้ไม่มีเมธอดหรือแอตทริบิวต์ที่เรียก': 'This type has no such method or attribute',
    'ไม่มีโมดูลนี้ใน Sandbox (ถ้าเป็นไฟล์ของคุณเอง ให้เปิดเป็นแท็บก่อน)': 'This module is not in the Sandbox (if it is your own file, open it as a tab first)',
    'ฟังก์ชันเรียกตัวเองลึกเกินไป อาจลืมกรณีหยุด (base case)': 'The function calls itself too deeply. You may be missing a base case',

    // AI Shifu
    'AI Shifu ผู้ช่วยแนะนำโค้ด': 'AI Shifu code helper',
    'โหมดใบ้ ไม่เฉลย': 'Hints only, no answers',
    'AI Shifu ใช้งานได้เมื่อเปิดเว็บนี้ใน Claude (และอนุญาตให้หน้านี้ใช้ Claude) ส่วนการเขียนและรันโค้ดใช้ได้ตามปกติ': 'AI Shifu works when this site is opened in Claude (and the page is allowed to use Claude). Writing and running code works as usual',
    'AI Shifu ใช้งานได้เมื่อเปิดเว็บนี้ใน Claude': 'AI Shifu works when this site is opened in Claude',
    'ยังใช้ AI Shifu ในหน้านี้ไม่ได้ (ยังไม่ได้อนุญาตให้ใช้ Claude)': 'AI Shifu is not available on this page yet (Claude access has not been allowed)',
    'ใช้งานถี่เกินไป รอสักครู่แล้วลองใหม่นะ': 'Too many requests. Wait a moment and try again',
    'กรุณาเข้าสู่ระบบ Claude ใหม่อีกครั้ง': 'Please sign in to Claude again',
    'AI Shifu ตอบคำถามนี้ไม่ได้ ลองถามแบบอื่นดูนะ': 'AI Shifu could not answer this. Try asking another way',
    'โค้ดยาวเกินไปสำหรับ AI ลองเลือกเฉพาะส่วนที่สงสัย': 'The code is too long for the AI. Try only the part you are unsure about',
    'AI ตอบกลับในรูปแบบที่อ่านไม่ได้ ลองกดตรวจอีกครั้ง': 'The AI reply could not be read. Try checking again',
    'การเชื่อมต่อขัดข้อง ลองใหม่อีกครั้ง': 'Connection problem. Try again',
    'AI Shifu กำลังคิด…': 'AI Shifu is thinking…',
    '(คำตอบยาวเกิน ถูกตัดบางส่วน)': '(reply too long, part was cut)',
    'ยังไม่มีโค้ดให้ตรวจ ลองเขียนโค้ดสักหน่อยก่อนนะ': 'There is no code to check yet. Write some code first',
    'ตรวจโค้ดนี้ให้หน่อย': 'Please check this code',
    'กำลังตรวจโค้ด…': 'Checking code…',
    'อ่านผลตรวจไม่ได้ ลองกดตรวจอีกครั้งนะ': 'Could not read the check result. Try again',
    'ผลตรวจโค้ด': 'Code check',
    'ดีแล้ว': 'Looks good',
    'ควรปรับ': 'Needs work',
    'ขอคำใบ้เพิ่ม': 'More hints',
    'สวัสดี! ผมคือ AI Shifu ช่วยตรวจโค้ดและให้คำใบ้ได้ (ไม่เฉลยนะ) ลองกด': "Hi! I'm AI Shifu. I can check your code and give hints (no answers). Press",
    'หรือพิมพ์ถามได้เลย': 'or type a question',
    'ตรวจโค้ดนี้': 'Check this code',
    'อธิบายทีละบรรทัด': 'Explain line by line',
    'ทำไมถึง error?': 'Why the error?',
    'ถาม AI Shifu': 'Ask AI Shifu',
    'ถาม AI Shifu เกี่ยวกับโค้ดของคุณ…': 'Ask AI Shifu about your code…',
    'ส่งคำถาม': 'Send question',
    'AI อาจแนะนำผิดได้ ลองรันและทดสอบโค้ดด้วยตัวเองทุกครั้ง': 'AI can be wrong. Always run and test your code yourself',

    // แบบฝึกหัด
    'รายการโจทย์': 'Exercise list',
    'ความคืบหน้า': 'Progress',
    'ค้นหาโจทย์': 'Search exercises',
    'เช่น ลูป, สตริง': 'e.g. loop, string',
    'กรองตามระดับ': 'Filter by level',
    'ทั้งหมด': 'All',
    'ง่าย': 'Easy',
    'กลาง': 'Medium',
    'ยาก': 'Hard',
    'ไม่พบโจทย์': 'No exercises found',
    'ลองเปลี่ยนคำค้นหาหรือระดับความยาก': 'Try another search or level',
    'ตัวอย่างการรันโปรแกรม': 'Sample run',
    'ทดสอบตัวอย่าง': 'Test sample',
    'ส่งคำตอบ': 'Submit',
    'ยังไม่ได้ตรวจ': 'Not checked yet',
    'กด “ทดสอบตัวอย่าง” เพื่อลองกับตัวอย่าง หรือ “ส่งคำตอบ” เพื่อตรวจกับ test case ทั้งหมด': 'Press “Test sample” to try the sample, or “Submit” to check against all test cases',
    'กำลังตรวจ…': 'Checking…',
    'ตรวจไม่ได้': 'Could not check',
    '✓ ผ่าน': '✓ Passed',
    '✗ ไม่ผ่าน': '✗ Failed',
    'โค้ดใช้เวลานานเกินไป (อาจมีลูปไม่รู้จบ) ลองตรวจเงื่อนไขของลูปอีกครั้ง': 'The code took too long (maybe an infinite loop). Check your loop conditions',
    'ผลที่ต้องการ': 'Expected',
    'ผลจากโค้ดของคุณ': 'Your output',
    '(ไม่มีข้อความแสดงผล)': '(no output)',
    'ยอดเยี่ยม! ผ่านทุก test case แล้ว': 'Excellent! All test cases passed',
    'ผ่านทุก test case อีกครั้ง': 'All test cases passed again',
    'ทำครบทุกข้อแล้ว!': 'All exercises done!',
    'ผ่านตัวอย่างแล้ว ลองกด “ส่งคำตอบ” เพื่อตรวจกับ test case ทั้งหมด': 'Sample passed. Press “Submit” to check against all test cases',
    'แบบฝึกหัด · PIKO': 'Exercises · PIKO',

    // ข้อมูลโจทย์ (exercises-data.js)
    'คำสั่ง print': 'The print statement',
    'คำสั่ง input': 'The input statement',
    'รับค่าอายุ': 'Read an age',
    'เขียนโปรแกรมแสดงข้อความ': 'Write a program that prints',
    'ออกทางหน้าจอ โดยใช้คำสั่ง': 'to the screen using',
    '# เขียนโค้ดตรงนี้': '# Write your code here',
    'เขียนโปรแกรมรับอายุจากผู้ใช้': 'Write a program that reads the user\'s age'
  };

  var PATTERNS = [
    [/^บรรทัด (\d+), คอลัมน์ (\d+)$/, 'Ln $1, Col $2'],
    [/^ตัวแก้ไขโค้ด (.+) \(กด Esc แล้ว Tab เพื่อออก\)$/, 'Code editor $1 (press Esc then Tab to leave)'],
    [/^แก้ชื่อไฟล์ (.+)$/, 'Rename $1'],
    [/^ปิดไฟล์ (.+)$/, 'Close $1'],
    [/^ผู้ช่วยแนะนำโค้ด · อ่านโค้ดใน (.+) แล้ว$/, 'Code helper · reading $1'],
    [/^กด “ปิด\?” อีกครั้งเพื่อปิด (.+) \(โค้ดในไฟล์นี้จะหายไป\)$/, 'Press “Close?” again to close $1 (its code will be lost)'],
    [/^ไฟล์ (.+) ใหญ่เกิน 1 MB$/, 'File $1 is larger than 1 MB'],
    [/^เปิด (.+) แล้ว$/, 'Opened $1'],
    [/^บันทึกเป็น (.+)\.txt แล้ว \(ลบ \.txt ท้ายชื่อเพื่อใช้เป็นไฟล์ \.py\)$/, 'Saved as $1.txt (remove the trailing .txt to use it as a .py file)'],
    [/^ดาวน์โหลด (.+) แล้ว$/, 'Downloaded $1'],
    [/^หยุดการทำงาน: โค้ดใช้เวลานานเกิน (\d+) วินาที \(อาจมีลูปไม่รู้จบ\)$/, 'Stopped: the code ran longer than $1 seconds (maybe an infinite loop)'],
    [/^คำแนะนำ: (.+)$/, function (m) { return 'Tip: ' + tr(m[1]); }],
    [/^AI Shifu · บรรทัด (\d+)$/, 'AI Shifu · line $1'],
    [/^ไปที่บรรทัด (\d+)$/, 'Go to line $1'],
    [/^บรรทัด (\d+)$/, 'Line $1'],
    [/^ผ่าน (\d+)\/(\d+)$/, 'Passed $1/$2'],
    [/^ผ่าน (\d+) \/ (\d+)$/, 'Passed $1 / $2'],
    [/^ผ่านแล้ว (\d+) จาก (\d+) ข้อ · (.+)$/, function (m) { return m[1] + ' of ' + m[2] + ' solved · ' + tr(m[3]); }],
    [/^ผ่านแล้ว (\d+) จาก (\d+) ข้อ$/, '$1 of $2 solved'],
    [/^ผ่านครบทั้ง (\d+) ข้อ$/, 'All $1 exercises solved'],
    [/^ข้อ (\d+) · (.+)$/, function (m) { return 'Exercise ' + m[1] + ' · ' + tr(m[2]); }],
    [/^ข้อ (\d+) (.+?)( \(ผ่านแล้ว\)| \(กำลังทำ\))?$/, function (m) {
      return 'Exercise ' + m[1] + ' ' + tr(m[2]) + (m[3] ? (m[3].indexOf('ผ่าน') !== -1 ? ' (solved)' : ' (in progress)') : '');
    }],
    [/^ข้อ (\d+)$/, 'Ex. $1'],
    [/^(.+) · ผ่านแล้ว$/, function (m) { return tr(m[1]) + ' · solved'; }],
    [/^ตัวอย่าง: ผ่าน (\d+) \/ (\d+) test case$/, 'Sample: passed $1 / $2 test cases'],
    [/^ผ่าน (\d+) \/ (\d+) test case$/, 'Passed $1 / $2 test cases'],
    [/^โปรแกรมเรียก input\(\) มากกว่าที่โจทย์กำหนด \(โจทย์นี้รับค่า (\d+) ครั้ง\)$/, 'The program called input() more times than required (this exercise reads $1 values)'],
    [/^ข้อถัดไป: (.+) →$/, function (m) { return 'Next: ' + tr(m[1]) + ' →'; }],
    [/^ได้ (.+)$/, 'got $1']
  ];

  var THAI = /[฀-๿]/;
  function tr(text) {
    if (!text || !THAI.test(text)) return text;
    var lead = text.match(/^\s*/)[0], trail = text.match(/\s*$/)[0];
    var core = text.trim();
    if (Object.prototype.hasOwnProperty.call(DICT, core)) return lead + DICT[core] + trail;
    for (var i = 0; i < PATTERNS.length; i++) {
      var m = core.match(PATTERNS[i][0]);
      if (m) {
        var out = typeof PATTERNS[i][1] === 'function' ? PATTERNS[i][1](m) : core.replace(PATTERNS[i][0], PATTERNS[i][1]);
        return lead + out + trail;
      }
    }
    return text;
  }

  // ส่วนที่ไม่แปล: โค้ดและข้อความที่ผู้เรียนพิมพ์
  var SKIP = '.piko-legal, textarea, input, pre.hl, .gutter, .term-input, .transcript, .compare pre, script, style';
  var ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  var origText = new WeakMap();   // text node -> ข้อความไทยต้นฉบับ
  var origAttr = new WeakMap();   // element -> { attr: ข้อความไทย }
  var lang = 'th';
  try { lang = localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'th'; } catch (e) { /* ignore */ }
  window.PIKO_LANG = lang;
  var busy = false;

  function skipped(node) {
    var el = node.nodeType === 1 ? node : node.parentElement;
    if (!el) return true;
    if (el.closest('.muted')) return false; // ข้อความระบบที่อยู่ในกล่องผลลัพธ์ เช่น (ไม่มีข้อความแสดงผล)
    return !!el.closest(SKIP);
  }
  function doText(node) {
    if (skipped(node)) return;
    var v = node.nodeValue;
    if (lang === 'en') {
      if (!THAI.test(v)) return;
      var t = tr(v);
      if (t !== v) { origText.set(node, v); node.nodeValue = t; }
    } else if (origText.has(node)) {
      node.nodeValue = origText.get(node); origText.delete(node);
    }
  }
  function doAttrs(el) {
    if (el.closest && el.closest('script, style')) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (!el.hasAttribute || !el.hasAttribute(a)) continue;
      var v = el.getAttribute(a), store = origAttr.get(el);
      if (lang === 'en') {
        if (!THAI.test(v)) continue;
        var t = tr(v);
        if (t !== v) { if (!store) { store = {}; origAttr.set(el, store); } store[a] = v; el.setAttribute(a, t); }
      } else if (store && store[a] != null) {
        el.setAttribute(a, store[a]); delete store[a];
      }
    }
  }
  function walk(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1) return;
    doAttrs(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    var n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }
  function doTitle() {
    if (lang === 'en' && THAI.test(document.title)) { var t = tr(document.title); if (t !== document.title) document.title = t; }
  }

  var mo = new MutationObserver(function (list) {
    if (busy || lang !== 'en') return;
    busy = true;
    try {
      list.forEach(function (m) {
        if (m.type === 'characterData') doText(m.target);
        else if (m.type === 'attributes') doAttrs(m.target);
        else m.addedNodes.forEach(walk);
      });
      doTitle();
    } finally { busy = false; }
  });

  function apply() {
    document.documentElement.lang = lang;
    busy = true;
    try { walk(document.body); doTitle(); } finally { busy = false; }
    document.querySelectorAll('[data-set-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-set-lang') === lang ? 'true' : 'false');
    });
  }
  function setLang(l) {
    lang = l === 'en' ? 'en' : 'th';
    window.PIKO_LANG = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ }
    apply();
  }

  document.querySelectorAll('[data-set-lang]').forEach(function (b) {
    b.addEventListener('click', function () { if (b.getAttribute('data-set-lang') !== lang) setLang(b.getAttribute('data-set-lang')); });
  });
  mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  window.addEventListener('hashchange', function () { setTimeout(doTitle, 0); });
  apply();
  window.PIKO_tr = tr;
})();
