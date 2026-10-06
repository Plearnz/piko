/* PIKO \u2014 \u0E40\u0E27\u0E47\u0E1A\u0E1D\u0E36\u0E01 Python
 * - Router \u0E41\u0E1A\u0E1A hash: #home, #sandbox, #exercises, #exercises.<id>
 * - \u0E23\u0E31\u0E19 Python \u0E43\u0E19\u0E40\u0E1A\u0E23\u0E32\u0E27\u0E4C\u0E40\u0E0B\u0E2D\u0E23\u0E4C\u0E14\u0E49\u0E27\u0E22 Pyodide
 * - input(): \u0E40\u0E21\u0E37\u0E48\u0E2D\u0E42\u0E04\u0E49\u0E14\u0E02\u0E2D input \u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E30\u0E2B\u0E22\u0E38\u0E14 \u0E43\u0E2B\u0E49\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E1E\u0E34\u0E21\u0E1E\u0E4C\u0E43\u0E19 Terminal \u0E41\u0E25\u0E49\u0E27\u0E23\u0E31\u0E19\u0E43\u0E2B\u0E21\u0E48\u0E15\u0E31\u0E49\u0E07\u0E41\u0E15\u0E48\u0E15\u0E49\u0E19\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E04\u0E33\u0E15\u0E2D\u0E1A\u0E17\u0E35\u0E48\u0E2A\u0E30\u0E2A\u0E21\u0E44\u0E27\u0E49
 * - AI Shifu: \u0E43\u0E0A\u0E49\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16 "sample" \u0E02\u0E2D\u0E07 Claude (\u0E17\u0E33\u0E07\u0E32\u0E19\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E40\u0E1B\u0E34\u0E14\u0E2B\u0E19\u0E49\u0E32\u0E40\u0E27\u0E47\u0E1A\u0E43\u0E19 Claude)
 * - \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E44\u0E1F\u0E25\u0E4C: \u0E43\u0E19 Claude \u0E43\u0E0A\u0E49 "downloads" (.txt) / \u0E19\u0E2D\u0E01 Claude \u0E14\u0E32\u0E27\u0E19\u0E4C\u0E42\u0E2B\u0E25\u0E14\u0E40\u0E1B\u0E47\u0E19 .py
 */
(function () {
  'use strict';

  var PYODIDE_URL = window.PIKO_PYODIDE_URL ? new URL(window.PIKO_PYODIDE_URL, location.href).href : 'https://cdn.jsdelivr.net/npm/pyodide@314.0.7/';
  var RUN_LIMIT_SEC = 5;
  var OUTPUT_LIMIT = 100000;
  var EXERCISES = window.PIKO_EXERCISES || [];

  /* ------------------------------------------------------------ utils */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]);
    });
    if (text != null) e.textContent = text;
    return e;
  }
  function wait(ms, v) { return new Promise(function (r) { setTimeout(function () { r(v); }, ms); }); }
  function escRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function claudeUse(name) {
    try {
      if (window.claude && typeof window.claude.use === 'function') return Promise.resolve(window.claude.use(name)).catch(function () { return null; });
    } catch (e) { /* ignore */ }
    return Promise.resolve(null);
  }

  /* ------------------------------------------------------------ storage (\u0E44\u0E21\u0E48\u0E1A\u0E31\u0E07\u0E04\u0E31\u0E1A) */
  // ความคืบหน้าแยกตามรหัสนักศึกษา
  var STORE_KEY = window.PIKO_USER && window.PIKO_USER.sid ? 'piko.v2.' + window.PIKO_USER.sid : 'piko.v2';
  var store = { solved: {}, code: {}, codeAt: {}, current: null, files: null, filesAt: 0, active: 0, updatedAt: 0 };
  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (raw) { var parsed = JSON.parse(raw); Object.keys(store).forEach(function (k) { if (parsed[k] != null) store[k] = parsed[k]; }); }
  } catch (e) { /* ไม่มี storage ก็ใช้งานได้ปกติ */ }

  /* ------------------------------------------------------------ ซิงก์ความคืบหน้ากับเซิร์ฟเวอร์ (ข้ามอุปกรณ์/เบราว์เซอร์)
   * - window.PIKO_PROGRESS ถูกโหลดมาก่อนเริ่มแอป (ดู index.html)
   * - solved: รวมกันทุกเครื่อง (ไม่มีวันหาย) · code: เลือกฉบับที่แก้ล่าสุดเป็นรายข้อ · ไฟล์ Sandbox: เลือกชุดที่แก้ล่าสุด */
  var SYNC_USER = (window.PIKO_USER && window.PIKO_USER.token) ? window.PIKO_USER : null;
  var SYNC_KEYS = ['solved', 'code', 'codeAt', 'current', 'files', 'filesAt', 'active'];
  var SYNC_DEF = { solved: {}, code: {}, codeAt: {}, current: null, files: null, filesAt: 0, active: 0 };
  var syncTimer = null, syncDirty = false;
  function syncPayload() { var p = {}; SYNC_KEYS.forEach(function (k) { p[k] = store[k]; }); return p; }
  function syncNorm(o) { var p = {}; SYNC_KEYS.forEach(function (k) { p[k] = (o && o[k] !== undefined && o[k] !== null) ? o[k] : SYNC_DEF[k]; }); return p; }
  (function mergeRemote() {
    var R = window.PIKO_PROGRESS;
    if (!SYNC_USER || !R) return;
    var r = syncNorm(R.data), rAt = R.updatedAt || 0;
    Object.keys(r.solved).forEach(function (k) { if (r.solved[k]) store.solved[k] = r.solved[k]; });
    var ids = {};
    Object.keys(store.code).forEach(function (k) { ids[k] = 1; });
    Object.keys(r.code).forEach(function (k) { ids[k] = 1; });
    Object.keys(ids).forEach(function (k) {
      var hasL = store.code[k] != null, hasR = r.code[k] != null;
      var lt = (store.codeAt && store.codeAt[k]) || 0, rt = r.codeAt[k] || 0;
      if (hasR && (!hasL || rt > lt)) { store.code[k] = r.code[k]; store.codeAt[k] = rt; }
    });
    if (r.files && r.files.length && r.filesAt > (store.filesAt || 0)) { store.files = r.files; store.filesAt = r.filesAt; store.active = r.active; }
    if (rAt > (store.updatedAt || 0)) { if (r.current) store.current = r.current; store.updatedAt = rAt; }
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* ignore */ }
    if (JSON.stringify(syncPayload()) !== JSON.stringify(r)) syncDirty = true;
  })();
  var lastFiles = JSON.stringify(store.files);
  function pushNow(unload) {
    if (!SYNC_USER || !syncDirty) return;
    syncDirty = false; clearTimeout(syncTimer);
    var body = syncPayload();
    var text = JSON.stringify({ data: body, updatedAt: store.updatedAt });
    if (text.length > 190000) { body.files = null; body.filesAt = 0; text = JSON.stringify({ data: body, updatedAt: store.updatedAt }); }
    fetch('api/progress', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + SYNC_USER.token },
      body: text,
      keepalive: !!unload && text.length < 60000
    }).then(function (res) {
      if (res.status === 401) SYNC_USER = null;        // หมดอายุ → ครั้งหน้าที่เปิดเว็บจะให้ล็อกอินใหม่
      else if (!res.ok && res.status !== 413) syncDirty = true;
    }).catch(function () { syncDirty = true; });       // ออฟไลน์ → ลองใหม่ภายหลัง
  }
  var saveTimer = null;
  function persist() {
    saveTimer = null;
    var fs = JSON.stringify(store.files);
    if (fs !== lastFiles) { store.filesAt = Date.now(); lastFiles = fs; }
    store.updatedAt = Date.now();
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* ignore */ }
    if (SYNC_USER) { syncDirty = true; clearTimeout(syncTimer); syncTimer = setTimeout(pushNow, 4000); }
  }
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 250);
  }
  function flushAll() { if (saveTimer) { clearTimeout(saveTimer); persist(); } pushNow(true); }
  window.addEventListener('pagehide', flushAll);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flushAll(); });
  setInterval(function () { pushNow(false); }, 30000);
  if (syncDirty) syncTimer = setTimeout(pushNow, 1500);

  /* ------------------------------------------------------------ icons */
  var ICON = {
    term: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8BBEEA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
    trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A9B6C8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
    play: '<svg width="12" height="12" viewBox="0 0 24 24" fill="#1B2333" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4"/></svg>',
    pencil: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    folder: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EEF2F8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1"/><path d="M3 7v10a2 2 0 0 0 2 2h13l3-9H7l-3 9"/></svg>',
    download: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1B2333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    upload: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8BBEEA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.4 18.4A5 5 0 0 0 18 9h-1.3A8 8 0 1 0 3 16.3"/></svg>',
    spark: '<svg width="14" height="14" viewBox="0 0 24 24" fill="#E07A10" aria-hidden="true"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"/></svg>'
  };

  /* ------------------------------------------------------------ Python syntax highlight */
  var KW = new Set('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case'.split(' '));
  var BI = new Set('print input len range int str float list dict set tuple bool sum min max abs sorted enumerate zip map filter round type isinstance reversed any all chr ord divmod pow open super object format'.split(' '));
  var TOKEN_RE = /(#[^\n]*)|((?:[rRbBfFuU]{1,2})?(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?))|(\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([A-Za-z_\u0E00-\u0E7F][\w\u0E00-\u0E7F]*)/g;

  function highlight(src) {
    var out = '', last = 0, m, prevWord = '';
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(src))) {
      if (m[0] === '') { TOKEN_RE.lastIndex++; continue; }
      out += esc(src.slice(last, m.index));
      var t = esc(m[0]);
      if (m[1]) out += '<span class="tok-com">' + t + '</span>';
      else if (m[2]) out += '<span class="tok-str">' + t + '</span>';
      else if (m[3]) out += '<span class="tok-num">' + t + '</span>';
      else {
        var w = m[4];
        var isCall = /^\s*\(/.test(src.slice(m.index + w.length, m.index + w.length + 40));
        if (KW.has(w)) out += '<span class="tok-kw">' + t + '</span>';
        else if (prevWord === 'def' || prevWord === 'class') out += '<span class="tok-fn">' + t + '</span>';
        else if (BI.has(w) && isCall) out += '<span class="tok-bi">' + t + '</span>';
        else if (isCall) out += '<span class="tok-fn">' + t + '</span>';
        else out += t;
        prevWord = w;
        last = TOKEN_RE.lastIndex;
        continue;
      }
      prevWord = '';
      last = TOKEN_RE.lastIndex;
    }
    return out + esc(src.slice(last));
  }

  /* ------------------------------------------------------------ Code editor */
  var LINE_H = 27, PAD_TOP = 16;

  function createEditor(root, opts) {
    root.innerHTML =
      '<div class="editor-bar"><div class="tabs" role="tablist" aria-label="\u0E44\u0E1F\u0E25\u0E4C">' +
      (opts.filename ? '<span class="tab" role="tab" aria-selected="true"><span class="tab-name">' + esc(opts.filename) + '</span></span>' : '') +
      '</div><div class="bar-actions"></div></div>' +
      '<div class="editor-body"><pre class="gutter" aria-hidden="true">1</pre>' +
      '<div class="code-area"><div class="marks"></div><pre class="hl" aria-hidden="true"></pre>' +
      '<textarea spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="\u0E15\u0E31\u0E27\u0E41\u0E01\u0E49\u0E44\u0E02\u0E42\u0E04\u0E49\u0E14 (\u0E01\u0E14 Esc \u0E41\u0E25\u0E49\u0E27 Tab \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2D\u0E2D\u0E01)"></textarea></div></div>' +
      '<div class="editor-status"><span class="pos">\u0E1A\u0E23\u0E23\u0E17\u0E31\u0E14 1, \u0E04\u0E2D\u0E25\u0E31\u0E21\u0E19\u0E4C 1</span><span class="mid"></span><span>UTF-8 \u00B7 Spaces: 4</span></div>';
    var ta = $('textarea', root), hl = $('.hl', root), gutter = $('.gutter', root), body = $('.editor-body', root),
      pos = $('.pos', root), marks = $('.marks', root), mid = $('.mid', root);
    var listeners = [];
    var escapeTab = false, lineCount = 1, midDefault = '', midTimer = null;

    function render() {
      var v = ta.value;
      hl.innerHTML = highlight(v) + (v === '' || v.slice(-1) === '\n' ? ' ' : '');
      var n = v.split('\n').length, g = '';
      for (var i = 1; i <= n; i++) g += i + (i < n ? '\n' : '');
      gutter.textContent = g;
      if (n !== lineCount) { lineCount = n; clearMark(); }
    }
    function caretInfo() {
      var before = ta.value.slice(0, ta.selectionStart);
      var lines = before.split('\n');
      return { line: lines.length, col: lines[lines.length - 1].length + 1 };
    }
    function updatePos() {
      var c = caretInfo();
      pos.textContent = '\u0E1A\u0E23\u0E23\u0E17\u0E31\u0E14 ' + c.line + ', \u0E04\u0E2D\u0E25\u0E31\u0E21\u0E19\u0E4C ' + c.col;
      var top = PAD_TOP + (c.line - 1) * LINE_H;
      if (top < body.scrollTop) body.scrollTop = top - 8;
      else if (top + LINE_H > body.scrollTop + body.clientHeight) body.scrollTop = top + LINE_H - body.clientHeight + 8;
      var cw = 9.03;
      var left = gutter.offsetWidth + 8 + (c.col - 1) * cw;
      if (left > body.scrollLeft + body.clientWidth - 24) body.scrollLeft = left - body.clientWidth + 48;
      else if (left < body.scrollLeft + gutter.offsetWidth) body.scrollLeft = Math.max(0, left - gutter.offsetWidth - 24);
    }
    function changed() { render(); updatePos(); listeners.forEach(function (fn) { fn(ta.value); }); }
    function insert(text) {
      ta.focus();
      var ok = false;
      try { ok = document.execCommand('insertText', false, text); } catch (e) { ok = false; }
      if (!ok) { ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end'); }
      changed();
    }
    function clearMark() { marks.innerHTML = ''; }
    function markLine(line, html) {
      clearMark();
      line = Math.max(1, Math.min(line, lineCount));
      var top = PAD_TOP + (line - 1) * LINE_H;
      var m = el('div', { class: 'line-mark', 'aria-hidden': 'true' }); m.style.top = top + 'px';
      marks.appendChild(m);
      if (html) {
        var tip = el('div', { class: 'line-tip', role: 'note' });
        tip.style.top = (top + LINE_H + 8) + 'px';
        tip.innerHTML = '<span class="ico">' + ICON.spark + '</span><span class="tip-txt">' + html + '</span>';
        var x = el('button', { type: 'button', class: 'x', 'aria-label': '\u0E1B\u0E34\u0E14\u0E04\u0E33\u0E41\u0E19\u0E30\u0E19\u0E33' }, '\u00D7');
        x.addEventListener('click', clearMark);
        tip.appendChild(x);
        marks.appendChild(tip);
      }
    }
    function gotoLine(line) {
      var lines = ta.value.split('\n');
      line = Math.max(1, Math.min(line, lines.length));
      var off = 0;
      for (var i = 0; i < line - 1; i++) off += lines[i].length + 1;
      ta.focus();
      ta.setSelectionRange(off, off);
      updatePos();
      var top = PAD_TOP + (line - 1) * LINE_H;
      body.scrollTop = Math.max(0, top - body.clientHeight / 3);
    }

    ta.addEventListener('input', changed);
    ta.addEventListener('click', updatePos);
    ta.addEventListener('keyup', function (e) { if (e.key.indexOf('Arrow') === 0 || e.key === 'Home' || e.key === 'End') updatePos(); });
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { escapeTab = true; return; }
      if (e.key === 'Tab') {
        if (escapeTab) { escapeTab = false; return; }
        e.preventDefault();
        var v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
        var lineStart = v.lastIndexOf('\n', s - 1) + 1;
        if (e.shiftKey) {
          var seg = v.slice(lineStart, en);
          ta.setSelectionRange(lineStart, en); insert(seg.replace(/^ {1,4}/gm, ''));
        } else if (s !== en && v.slice(s, en).indexOf('\n') !== -1) {
          var seg2 = v.slice(lineStart, en);
          ta.setSelectionRange(lineStart, en); insert(seg2.replace(/^/gm, '    '));
        } else insert('    ');
        return;
      }
      escapeTab = false;
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        var val = ta.value, st = ta.selectionStart;
        var ls = val.lastIndexOf('\n', st - 1) + 1;
        var line = val.slice(ls, st);
        var indent = (line.match(/^ */) || [''])[0];
        if (/:\s*(#.*)?$/.test(line)) indent += '    ';
        e.preventDefault();
        insert('\n' + indent);
        return;
      }
      if (e.key === 'Backspace' && ta.selectionStart === ta.selectionEnd) {
        var v3 = ta.value, p = ta.selectionStart;
        var ls3 = v3.lastIndexOf('\n', p - 1) + 1;
        var before = v3.slice(ls3, p);
        if (before.length >= 4 && /^ +$/.test(before) && before.length % 4 === 0) {
          e.preventDefault();
          ta.setSelectionRange(p - 4, p); insert('');
        }
      }
    });

    ta.value = opts.value || '';
    render();
    return {
      root: root,
      tabs: $('.tabs', root),
      actions: $('.bar-actions', root),
      get value() { return ta.value; },
      set value(v) { ta.value = v; clearMark(); render(); body.scrollTop = 0; ta.setSelectionRange(0, 0); updatePos(); },
      get lineCount() { return lineCount; },
      setLabel: function (name) { ta.setAttribute('aria-label', '\u0E15\u0E31\u0E27\u0E41\u0E01\u0E49\u0E44\u0E02\u0E42\u0E04\u0E49\u0E14 ' + name + ' (\u0E01\u0E14 Esc \u0E41\u0E25\u0E49\u0E27 Tab \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2D\u0E2D\u0E01)'); },
      setMid: function (html) { midDefault = html; mid.innerHTML = html; },
      flash: function (text) {
        clearTimeout(midTimer);
        mid.textContent = text;
        midTimer = setTimeout(function () { mid.innerHTML = midDefault; }, 4500);
      },
      focus: function () { ta.focus(); },
      onChange: function (fn) { listeners.push(fn); },
      markLine: markLine,
      clearMark: clearMark,
      gotoLine: gotoLine
    };
  }

  /* ------------------------------------------------------------ Terminal */
  function createTerminal(root) {
    root.innerHTML =
      '<div class="term-bar"><span class="term-title">' + ICON.term + 'Terminal</span>' +
      '<span class="term-actions"><span class="term-state" hidden></span>' +
      '<button type="button" class="btn btn-sky btn-run">' + ICON.play + '\u0E23\u0E31\u0E19<span class="kbd">F5</span></button>' +
      '<button type="button" class="icon-btn term-clear" aria-label="\u0E25\u0E49\u0E32\u0E07 Terminal">' + ICON.trash + '</button></span></div>' +
      '<pre class="term-output" tabindex="0" aria-label="\u0E1C\u0E25\u0E25\u0E31\u0E1E\u0E18\u0E4C Terminal"></pre>' +
      '<div class="term-foot">\u0E1E\u0E34\u0E21\u0E1E\u0E4C\u0E04\u0E48\u0E32\u0E17\u0E35\u0E48 input() \u0E02\u0E2D\u0E44\u0E14\u0E49\u0E43\u0E19\u0E19\u0E35\u0E49\u0E40\u0E25\u0E22</div>';
    var out = $('.term-output', root), state = $('.term-state', root), clearBtn = $('.term-clear', root);
    var size = 0, truncated = false, lastChar = '\n';
    var api = {
      runBtn: $('.btn-run', root),
      text: function () { return out.textContent; },
      clear: function () { out.textContent = ''; size = 0; truncated = false; lastChar = '\n'; },
      write: function (text, cls) {
        if (!text) return;
        if (size > OUTPUT_LIMIT) {
          if (!truncated) { truncated = true; out.appendChild(el('span', { class: 't-info' }, '\n\u2026 (\u0E1C\u0E25\u0E25\u0E31\u0E1E\u0E18\u0E4C\u0E22\u0E32\u0E27\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B \u0E15\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19\u0E17\u0E35\u0E48\u0E40\u0E2B\u0E25\u0E37\u0E2D)\n')); }
          return;
        }
        size += text.length;
        var last = out.lastChild;
        if (!cls && last && last.nodeType === 3) last.textContent += text;
        else out.appendChild(cls ? el('span', { class: cls }, text) : document.createTextNode(text));
        lastChar = text.slice(-1);
        out.scrollTop = out.scrollHeight;
      },
      newline: function () { if (lastChar !== '\n') api.write('\n'); },
      prompt: function () { api.newline(); api.write('$ ', 't-prompt'); },
      state: function (text, kind) {
        if (!text) { state.hidden = true; return; }
        state.hidden = false; state.textContent = text; state.className = 'term-state' + (kind ? ' ' + kind : '');
      },
      askInput: function (cb) {
        var inp = el('input', { class: 'term-input', type: 'text', 'aria-label': '\u0E1E\u0E34\u0E21\u0E1E\u0E4C\u0E04\u0E48\u0E32\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A input() \u0E41\u0E25\u0E49\u0E27\u0E01\u0E14 Enter', autocomplete: 'off', spellcheck: 'false' });
        out.appendChild(inp);
        inp.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); var v = inp.value; inp.disabled = true; cb(v); }
        });
        out.scrollTop = out.scrollHeight;
        setTimeout(function () { inp.focus(); }, 0);
      }
    };
    clearBtn.addEventListener('click', function () { api.clear(); api.state(null); api.prompt(); });
    out.addEventListener('click', function () { var i = $('.term-input:not([disabled])', out); if (i) i.focus(); });
    return api;
  }

  /* ------------------------------------------------------------ Pyodide */
  var PY_SETUP = String.raw`
import sys, os, time, traceback, linecache, json, random, builtins, importlib
import piko_bridge

class _Out:
    def __init__(self, kind):
        self.kind = kind
    def write(self, s):
        if s:
            piko_bridge.write(str(s), self.kind)
        return len(s)
    def flush(self):
        pass

class NeedInput(Exception):
    pass

class PikoTimeout(Exception):
    pass

_state = {"i": 0, "inputs": None}

def _input(prompt=""):
    if prompt != "":
        sys.stdout.write(str(prompt))
    i = _state["i"]
    if _state["inputs"] is not None:
        if i >= len(_state["inputs"]):
            raise NeedInput()
        v = _state["inputs"][i]
        _state["i"] += 1
        sys.stdout.write(v + "\n")
        return v
    if not piko_bridge.has_input(i):
        raise NeedInput()
    v = str(piko_bridge.get_input(i))
    _state["i"] += 1
    piko_bridge.write(v + "\n", "in")
    return v

def _tracer(limit):
    start = time.time()
    n = [0]
    def tr(frame, event, arg):
        n[0] += 1
        if n[0] % 2000 == 0 and time.time() - start > limit:
            raise PikoTimeout()
        return tr
    return tr

def _format_error(e, filename):
    t = e.__traceback__
    while t is not None and t.tb_frame.f_code.co_filename != filename:
        t = t.tb_next
    return "".join(traceback.format_exception(type(e), e, t))

def _exec_user(code, filename, ns, limit):
    linecache.cache[filename] = (len(code), None, code.splitlines(True), filename)
    compiled = compile(code, filename, "exec")
    sys.settrace(_tracer(limit))
    try:
        exec(compiled, ns)
    finally:
        sys.settrace(None)

def _prep(names_json):
    names = json.loads(names_json)
    cwd = os.getcwd()
    if cwd not in sys.path:
        sys.path.insert(0, cwd)
    for n in names:
        m = n[:-3] if n.endswith(".py") else n
        sys.modules.pop(m, None)
    importlib.invalidate_caches()

def _run_user(code, filename="main.py", limit=5.0, seed=0):
    _state["i"] = 0
    _state["inputs"] = None
    random.seed(seed)
    out, err = _Out("out"), _Out("err")
    old = (sys.stdout, sys.stderr, builtins.input)
    sys.stdout, sys.stderr = out, err
    builtins.input = _input
    ns = {"__name__": "__main__"}
    status = "ok"
    try:
        _exec_user(code, filename, ns, limit)
    except NeedInput:
        status = "need_input"
    except PikoTimeout:
        status = "timeout"
    except SystemExit:
        pass
    except BaseException as e:
        status = "error:" + type(e).__name__
        err.write(_format_error(e, filename))
    finally:
        sys.settrace(None)
        sys.stdout, sys.stderr, builtins.input = old
    return status

class _Capture:
    def __init__(self):
        self.parts = []
        self.size = 0
    def write(self, s):
        s = str(s)
        if self.size < 20000:
            self.parts.append(s)
            self.size += len(s)
        return len(s)
    def flush(self):
        pass

def _norm(s):
    lines = [l.rstrip() for l in s.replace("\r\n", "\n").split("\n")]
    while lines and lines[-1] == "":
        lines.pop()
    while lines and lines[0] == "":
        lines.pop(0)
    return "\n".join(lines)

def _grade_io(code, tests_json, limit=3.0):
    tests = json.loads(tests_json)
    filename = "solution.py"
    results = []
    old_in = builtins.input
    builtins.input = _input
    try:
        for t in tests:
            cap = _Capture()
            old = (sys.stdout, sys.stderr)
            sys.stdout = sys.stderr = cap
            _state["i"] = 0
            _state["inputs"] = [str(x) for x in t.get("inputs", [])]
            random.seed(0)
            row = {"ok": False, "status": "ok", "error": "", "error_type": ""}
            try:
                _exec_user(code, filename, {"__name__": "__main__"}, limit)
            except NeedInput:
                row["status"] = "need_input"
            except PikoTimeout:
                row["status"] = "timeout"
            except SystemExit:
                pass
            except BaseException as e:
                row["status"] = "error"
                row["error_type"] = type(e).__name__
                row["error"] = _format_error(e, filename)
            finally:
                sys.settrace(None)
                sys.stdout, sys.stderr = old
            row["got"] = "".join(cap.parts)
            row["expected"] = t["expected"]
            row["inputs"] = _state["inputs"]
            if row["status"] == "ok":
                row["ok"] = _norm(row["got"]) == _norm(t["expected"])
            results.append(row)
    finally:
        builtins.input = old_in
        _state["inputs"] = None
    return json.dumps({"results": results})
`;

  var bridgeTarget = { write: function () {}, inputs: [] };
  var bridge = {
    write: function (s, kind) { bridgeTarget.write(s, kind); },
    has_input: function (i) { return i < bridgeTarget.inputs.length; },
    get_input: function (i) { return String(bridgeTarget.inputs[i]); }
  };
  var pyPromise = null;

  function setPyStatus(state, text) {
    $all('[data-py-status]').forEach(function (n) {
      n.classList.remove('ready', 'failed');
      if (state) n.classList.add(state);
      $('.txt', n).textContent = text;
    });
  }
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = function () { reject(new Error('\u0E42\u0E2B\u0E25\u0E14\u0E2A\u0E04\u0E23\u0E34\u0E1B\u0E15\u0E4C\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08: ' + src)); };
      document.head.appendChild(s);
    });
  }
  function ensurePy() {
    if (!pyPromise) {
      setPyStatus(null, '\u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21 Python\u2026');
      pyPromise = (async function () {
        if (typeof window.loadPyodide !== 'function') await loadScript(PYODIDE_URL + 'pyodide.js');
        var py = await window.loadPyodide(window.PIKO_PYODIDE_STDLIB ? { indexURL: PYODIDE_URL, stdLibURL: new URL(window.PIKO_PYODIDE_STDLIB, location.href).href } : { indexURL: PYODIDE_URL });
        py.registerJsModule('piko_bridge', bridge);
        py.runPython(PY_SETUP);
        setPyStatus('ready', 'Python \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19');
        return py;
      })().catch(function (err) {
        console.error(err);
        setPyStatus('failed', '\u0E42\u0E2B\u0E25\u0E14 Python \u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08');
        pyPromise = null;
        throw err;
      });
    }
    return pyPromise;
  }

  var ERROR_TIPS = {
    NameError: '\u0E0A\u0E37\u0E48\u0E2D\u0E15\u0E31\u0E27\u0E41\u0E1B\u0E23\u0E2B\u0E23\u0E37\u0E2D\u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19\u0E19\u0E35\u0E49\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E2A\u0E23\u0E49\u0E32\u0E07 \u0E25\u0E2D\u0E07\u0E40\u0E0A\u0E47\u0E01\u0E01\u0E32\u0E23\u0E2A\u0E30\u0E01\u0E14 \u0E2B\u0E23\u0E37\u0E2D\u0E1B\u0E23\u0E30\u0E01\u0E32\u0E28\u0E01\u0E48\u0E2D\u0E19\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19',
    SyntaxError: '\u0E44\u0E27\u0E22\u0E32\u0E01\u0E23\u0E13\u0E4C\u0E1C\u0E34\u0E14 \u0E25\u0E2D\u0E07\u0E40\u0E0A\u0E47\u0E01\u0E27\u0E07\u0E40\u0E25\u0E47\u0E1A \u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E2B\u0E21\u0E32\u0E22 : \u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E2B\u0E21\u0E32\u0E22\u0E04\u0E33\u0E1E\u0E39\u0E14\u0E43\u0E2B\u0E49\u0E04\u0E23\u0E1A\u0E04\u0E39\u0E48',
    IndentationError: '\u0E01\u0E32\u0E23\u0E22\u0E48\u0E2D\u0E2B\u0E19\u0E49\u0E32\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 \u0E43\u0E0A\u0E49\u0E0A\u0E48\u0E2D\u0E07\u0E27\u0E48\u0E32\u0E07 4 \u0E0A\u0E48\u0E2D\u0E07\u0E43\u0E2B\u0E49\u0E40\u0E17\u0E48\u0E32\u0E01\u0E31\u0E19\u0E43\u0E19\u0E1A\u0E25\u0E47\u0E2D\u0E01\u0E40\u0E14\u0E35\u0E22\u0E27\u0E01\u0E31\u0E19',
    TabError: '\u0E1B\u0E19\u0E01\u0E31\u0E19\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07 Tab \u0E01\u0E31\u0E1A\u0E0A\u0E48\u0E2D\u0E07\u0E27\u0E48\u0E32\u0E07 \u0E43\u0E2B\u0E49\u0E43\u0E0A\u0E49\u0E0A\u0E48\u0E2D\u0E07\u0E27\u0E48\u0E32\u0E07 4 \u0E0A\u0E48\u0E2D\u0E07\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E40\u0E14\u0E35\u0E22\u0E27',
    TypeError: '\u0E0A\u0E19\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E19 \u0E40\u0E0A\u0E48\u0E19 \u0E19\u0E33 str \u0E21\u0E32\u0E1A\u0E27\u0E01\u0E01\u0E31\u0E1A int \u0E25\u0E2D\u0E07\u0E41\u0E1B\u0E25\u0E07\u0E14\u0E49\u0E27\u0E22 int() \u0E2B\u0E23\u0E37\u0E2D str()',
    ValueError: '\u0E04\u0E48\u0E32\u0E17\u0E35\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 \u0E40\u0E0A\u0E48\u0E19 int("abc") \u0E41\u0E1B\u0E25\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49',
    ZeroDivisionError: '\u0E2B\u0E32\u0E23\u0E14\u0E49\u0E27\u0E22\u0E28\u0E39\u0E19\u0E22\u0E4C\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 \u0E15\u0E23\u0E27\u0E08\u0E15\u0E31\u0E27\u0E2B\u0E32\u0E23\u0E01\u0E48\u0E2D\u0E19\u0E2B\u0E32\u0E23',
    IndexError: '\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07 (index) \u0E40\u0E01\u0E34\u0E19\u0E02\u0E19\u0E32\u0E14\u0E02\u0E2D\u0E07\u0E25\u0E34\u0E2A\u0E15\u0E4C\u0E2B\u0E23\u0E37\u0E2D\u0E2A\u0E15\u0E23\u0E34\u0E07',
    KeyError: '\u0E44\u0E21\u0E48\u0E21\u0E35 key \u0E19\u0E35\u0E49\u0E43\u0E19 dict \u0E25\u0E2D\u0E07\u0E43\u0E0A\u0E49 .get() \u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E0A\u0E47\u0E01\u0E14\u0E49\u0E27\u0E22 in \u0E01\u0E48\u0E2D\u0E19',
    AttributeError: '\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E0A\u0E19\u0E34\u0E14\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E21\u0E35\u0E40\u0E21\u0E18\u0E2D\u0E14\u0E2B\u0E23\u0E37\u0E2D\u0E41\u0E2D\u0E15\u0E17\u0E23\u0E34\u0E1A\u0E34\u0E27\u0E15\u0E4C\u0E17\u0E35\u0E48\u0E40\u0E23\u0E35\u0E22\u0E01',
    ModuleNotFoundError: '\u0E44\u0E21\u0E48\u0E21\u0E35\u0E42\u0E21\u0E14\u0E39\u0E25\u0E19\u0E35\u0E49\u0E43\u0E19 Sandbox (\u0E16\u0E49\u0E32\u0E40\u0E1B\u0E47\u0E19\u0E44\u0E1F\u0E25\u0E4C\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E40\u0E2D\u0E07 \u0E43\u0E2B\u0E49\u0E40\u0E1B\u0E34\u0E14\u0E40\u0E1B\u0E47\u0E19\u0E41\u0E17\u0E47\u0E1A\u0E01\u0E48\u0E2D\u0E19)',
    RecursionError: '\u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19\u0E40\u0E23\u0E35\u0E22\u0E01\u0E15\u0E31\u0E27\u0E40\u0E2D\u0E07\u0E25\u0E36\u0E01\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B \u0E2D\u0E32\u0E08\u0E25\u0E37\u0E21\u0E01\u0E23\u0E13\u0E35\u0E2B\u0E22\u0E38\u0E14 (base case)'
  };

  /* ================================================================ Sandbox */
  var DEFAULT_CODE = [
    (window.PIKO_LANG === 'en' ? '# Work out a grade from a score' : '# \u0E04\u0E33\u0E19\u0E27\u0E13\u0E40\u0E01\u0E23\u0E14\u0E08\u0E32\u0E01\u0E04\u0E30\u0E41\u0E19\u0E19'),
    'def grade(score):',
    '    if score >= 80:',
    '        return "A"',
    '    elif score >= 70:',
    '        return "B"',
    '    return "C"',
    '',
    (window.PIKO_LANG === 'en' ? 'name = input("Name: ")' : 'name = input("\u0E0A\u0E37\u0E48\u0E2D: ")'),
    (window.PIKO_LANG === 'en' ? 'score = int(input("Score: "))' : 'score = int(input("\u0E04\u0E30\u0E41\u0E19\u0E19: "))'),
    (window.PIKO_LANG === 'en' ? 'print(f"{name} got grade {grade(score)}")' : 'print(f"{name} \u0E44\u0E14\u0E49\u0E40\u0E01\u0E23\u0E14 {grade(score)}")'),
    ''
  ].join('\n');

  if (!Array.isArray(store.files) || !store.files.length) store.files = [{ name: 'main.py', code: DEFAULT_CODE }];
  if (!(store.active >= 0 && store.active < store.files.length)) store.active = 0;
  function activeFile() { return store.files[store.active]; }

  var sbEditor = createEditor($('#sb-editor'), { value: activeFile().code });
  var sbTerm = createTerminal($('#sb-terminal'));
  var sbRunBtn = sbTerm.runBtn;
  var sbState = { inputs: [], seed: 0, running: false };
  var writtenFiles = {};

  sbEditor.actions.innerHTML =
    '<button type="button" class="btn btn-ghost-dark btn-sm" id="sb-open">' + ICON.folder + '\u0E40\u0E1B\u0E34\u0E14\u0E44\u0E1F\u0E25\u0E4C</button>' +
    '<button type="button" class="btn btn-light btn-sm" id="sb-save">' + ICON.download + '\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01 .py</button>';
  sbEditor.setMid('<span class="drop-hint">' + ICON.upload + '\u0E25\u0E32\u0E01\u0E44\u0E1F\u0E25\u0E4C .py \u0E21\u0E32\u0E27\u0E32\u0E07\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E1B\u0E34\u0E14\u0E44\u0E14\u0E49</span>');
  sbTerm.write('Python Sandbox \u2014 \u0E40\u0E02\u0E35\u0E22\u0E19\u0E42\u0E04\u0E49\u0E14\u0E17\u0E32\u0E07\u0E0B\u0E49\u0E32\u0E22\u0E41\u0E25\u0E49\u0E27\u0E01\u0E14 \u0E23\u0E31\u0E19 \u0E2B\u0E23\u0E37\u0E2D F5\n', 't-info');
  sbTerm.prompt();
  sbEditor.onChange(function (v) { activeFile().code = v; save(); });

  /* ---- tabs ---- */
  function uniqueName(name, skip) {
    var base = name.replace(/\.py$/, ''), n = name, k = 2;
    while (store.files.some(function (f, i) { return i !== skip && f.name === n; })) { n = base + k + '.py'; k++; }
    return n;
  }
  function cleanName(name) {
    name = String(name || '').trim().replace(/\.(txt)$/i, '').replace(/[^\w\u0E00-\u0E7F.\-]+/g, '_');
    if (!name || name === '.py') name = 'untitled.py';
    if (!/\.py$/i.test(name)) name += '.py';
    return name;
  }
  function switchTab(i) {
    if (i === store.active) return;
    store.active = i; save();
    sbEditor.value = activeFile().code;
    renderTabs();
  }
  function renderTabs() {
    var t = sbEditor.tabs; t.innerHTML = '';
    store.files.forEach(function (f, i) {
      var active = i === store.active;
      var tab = el('div', { class: 'tab', role: 'tab', 'aria-selected': active ? 'true' : 'false' });
      var nameBtn = el('button', { type: 'button', class: 'tab-name' }, f.name);
      nameBtn.addEventListener('click', function () { switchTab(i); });
      tab.appendChild(nameBtn);
      if (active) {
        var ed = el('button', { type: 'button', class: 'tab-edit', title: '\u0E41\u0E01\u0E49\u0E0A\u0E37\u0E48\u0E2D\u0E44\u0E1F\u0E25\u0E4C', 'aria-label': '\u0E41\u0E01\u0E49\u0E0A\u0E37\u0E48\u0E2D\u0E44\u0E1F\u0E25\u0E4C ' + f.name });
        ed.innerHTML = ICON.pencil;
        ed.addEventListener('click', function () { startRename(tab, i); });
        tab.appendChild(ed);
      }
      if (store.files.length > 1) {
        var x = el('button', { type: 'button', class: 'tab-x', title: '\u0E1B\u0E34\u0E14\u0E44\u0E1F\u0E25\u0E4C', 'aria-label': '\u0E1B\u0E34\u0E14\u0E44\u0E1F\u0E25\u0E4C ' + f.name }, '\u00D7');
        x.addEventListener('click', function () { closeTab(i, x); });
        tab.appendChild(x);
      }
      t.appendChild(tab);
    });
    var add = el('button', { type: 'button', class: 'tab-add', title: '\u0E44\u0E1F\u0E25\u0E4C\u0E43\u0E2B\u0E21\u0E48', 'aria-label': '\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E44\u0E1F\u0E25\u0E4C\u0E43\u0E2B\u0E21\u0E48' }, '+');
    add.addEventListener('click', function () { addFile('untitled.py', '', true); });
    t.appendChild(add);
    sbEditor.setLabel(activeFile().name);
    var sub = $('#ai-sub'); if (sub) sub.textContent = '\u0E1C\u0E39\u0E49\u0E0A\u0E48\u0E27\u0E22\u0E41\u0E19\u0E30\u0E19\u0E33\u0E42\u0E04\u0E49\u0E14 \u00B7 \u0E2D\u0E48\u0E32\u0E19\u0E42\u0E04\u0E49\u0E14\u0E43\u0E19 ' + activeFile().name + ' \u0E41\u0E25\u0E49\u0E27';
  }
  function startRename(tab, i) {
    var f = store.files[i];
    var inp = el('input', { class: 'tab-rename', type: 'text', 'aria-label': '\u0E0A\u0E37\u0E48\u0E2D\u0E44\u0E1F\u0E25\u0E4C\u0E43\u0E2B\u0E21\u0E48' });
    inp.value = f.name;
    tab.innerHTML = ''; tab.appendChild(inp);
    inp.focus(); inp.setSelectionRange(0, f.name.replace(/\.py$/, '').length);
    var done = false;
    function commit(ok) {
      if (done) return; done = true;
      if (ok) { f.name = uniqueName(cleanName(inp.value), i); save(); }
      renderTabs();
    }
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); commit(true); }
      else if (e.key === 'Escape') { e.preventDefault(); commit(false); }
    });
    inp.addEventListener('blur', function () { commit(true); });
  }
  function addFile(name, code, rename) {
    store.files.push({ name: uniqueName(cleanName(name), -1), code: code });
    store.active = store.files.length - 1; save();
    sbEditor.value = code;
    renderTabs();
    if (rename) { var tabs = $all('.tab', sbEditor.tabs); startRename(tabs[tabs.length - 1], store.active); }
  }
  function closeTab(i, btn) {
    var f = store.files[i];
    if (f.code.trim() && !btn.dataset.armed) {
      btn.dataset.armed = '1'; btn.classList.add('armed'); btn.textContent = '\u0E1B\u0E34\u0E14?';
      sbEditor.flash('\u0E01\u0E14 \u201C\u0E1B\u0E34\u0E14?\u201D \u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1B\u0E34\u0E14 ' + f.name + ' (\u0E42\u0E04\u0E49\u0E14\u0E43\u0E19\u0E44\u0E1F\u0E25\u0E4C\u0E19\u0E35\u0E49\u0E08\u0E30\u0E2B\u0E32\u0E22\u0E44\u0E1B)');
      setTimeout(function () { if (btn.isConnected) { delete btn.dataset.armed; btn.classList.remove('armed'); btn.textContent = '\u00D7'; } }, 3500);
      return;
    }
    store.files.splice(i, 1);
    if (store.active >= store.files.length) store.active = store.files.length - 1;
    else if (i < store.active) store.active--;
    save();
    sbEditor.value = activeFile().code;
    renderTabs();
  }
  renderTabs();

  /* ---- open / drop files ---- */
  var fileInput = $('#sb-file');
  function openFiles(list) {
    var files = Array.prototype.slice.call(list || []).filter(function (f) { return /\.(py|txt)$/i.test(f.name); });
    if (!files.length) { sbEditor.flash('\u0E40\u0E1B\u0E34\u0E14\u0E44\u0E14\u0E49\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E44\u0E1F\u0E25\u0E4C .py \u0E2B\u0E23\u0E37\u0E2D .txt'); return; }
    files.forEach(function (file) {
      if (file.size > 1024 * 1024) { sbEditor.flash('\u0E44\u0E1F\u0E25\u0E4C ' + file.name + ' \u0E43\u0E2B\u0E0D\u0E48\u0E40\u0E01\u0E34\u0E19 1 MB'); return; }
      var r = new FileReader();
      r.onload = function () {
        var text = String(r.result).replace(/\r\n/g, '\n');
        var cur = activeFile();
        if (!cur.code.trim()) { cur.name = uniqueName(cleanName(file.name), store.active); cur.code = text; save(); sbEditor.value = text; renderTabs(); }
        else addFile(file.name, text, false);
        sbEditor.flash('\u0E40\u0E1B\u0E34\u0E14 ' + activeFile().name + ' \u0E41\u0E25\u0E49\u0E27');
      };
      r.readAsText(file);
    });
  }
  $('#sb-open').addEventListener('click', function () { fileInput.value = ''; fileInput.click(); });
  fileInput.addEventListener('change', function () { openFiles(fileInput.files); });
  var edRoot = $('#sb-editor'), dragDepth = 0;
  edRoot.addEventListener('dragenter', function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') !== -1) { e.preventDefault(); dragDepth++; edRoot.classList.add('dragging'); } });
  edRoot.addEventListener('dragover', function (e) { if (edRoot.classList.contains('dragging')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
  edRoot.addEventListener('dragleave', function () { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) edRoot.classList.remove('dragging'); });
  edRoot.addEventListener('drop', function (e) {
    if (!edRoot.classList.contains('dragging')) return;
    e.preventDefault(); dragDepth = 0; edRoot.classList.remove('dragging');
    openFiles(e.dataTransfer.files);
  });

  /* ---- save file ---- */
  var downloadsPromise = claudeUse('downloads');
  function blobDownload(name, code) {
    var url = URL.createObjectURL(new Blob([code], { type: 'text/x-python;charset=utf-8' }));
    var a = el('a', { href: url, download: name }); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  async function saveActive() {
    var f = activeFile();
    var dl = await Promise.race([downloadsPromise, wait(3000, null)]);
    if (dl) {
      try {
        await dl.save({ filename: f.name + '.txt', data: f.code || '\n' });
        sbEditor.flash('\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E40\u0E1B\u0E47\u0E19 ' + f.name + '.txt \u0E41\u0E25\u0E49\u0E27 (\u0E25\u0E1A .txt \u0E17\u0E49\u0E32\u0E22\u0E0A\u0E37\u0E48\u0E2D\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E0A\u0E49\u0E40\u0E1B\u0E47\u0E19\u0E44\u0E1F\u0E25\u0E4C .py)');
        return;
      } catch (e) {
        var c = e && e.code;
        if (c === 'declined') return;
        if (c === 'rate_limited') { sbEditor.flash('\u0E01\u0E33\u0E25\u0E31\u0E07\u0E21\u0E35\u0E2B\u0E19\u0E49\u0E32\u0E15\u0E48\u0E32\u0E07\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E40\u0E1B\u0E34\u0E14\u0E2D\u0E22\u0E39\u0E48 \u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07'); return; }
      }
    }
    try { blobDownload(f.name, f.code); sbEditor.flash('\u0E14\u0E32\u0E27\u0E19\u0E4C\u0E42\u0E2B\u0E25\u0E14 ' + f.name + ' \u0E41\u0E25\u0E49\u0E27'); }
    catch (e2) { sbEditor.flash('\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E44\u0E1F\u0E25\u0E4C\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E43\u0E19\u0E2B\u0E19\u0E49\u0E32\u0E19\u0E35\u0E49'); }
  }
  $('#sb-save').addEventListener('click', saveActive);

  /* ---- run ---- */
  var lastRun = { status: null };
  function syncFiles(py) {
    var names = store.files.map(function (f) { return f.name; });
    Object.keys(writtenFiles).forEach(function (n) {
      if (names.indexOf(n) === -1) { try { py.FS.unlink(n); } catch (e) { /* ignore */ } delete writtenFiles[n]; }
    });
    store.files.forEach(function (f) { try { py.FS.writeFile(f.name, f.code); writtenFiles[f.name] = 1; } catch (e) { /* ignore */ } });
    py.globals.get('_prep')(JSON.stringify(names));
  }
  async function sandboxRun(fresh) {
    if (sbState.running) return;
    if (fresh) { sbState.inputs = []; sbState.seed = Math.floor(Math.random() * 1e9); }
    sbState.running = true;
    sbRunBtn.disabled = true;
    var py;
    try {
      if (!pyPromise) { sbTerm.clear(); sbTerm.write('\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14 Python \u0E04\u0E23\u0E31\u0E49\u0E07\u0E41\u0E23\u0E01 \u0E2D\u0E32\u0E08\u0E43\u0E0A\u0E49\u0E40\u0E27\u0E25\u0E32\u0E2A\u0E31\u0E01\u0E04\u0E23\u0E39\u0E48\u2026\n', 't-info'); }
      py = await ensurePy();
    } catch (e) {
      sbTerm.write('\n\u0E42\u0E2B\u0E25\u0E14 Python \u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E2D\u0E34\u0E19\u0E40\u0E17\u0E2D\u0E23\u0E4C\u0E40\u0E19\u0E47\u0E15\u0E41\u0E25\u0E49\u0E27\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\n', 't-err');
      sbState.running = false; sbRunBtn.disabled = false;
      return;
    }
    var f = activeFile();
    sbTerm.clear();
    sbTerm.state(null);
    sbTerm.write('$ ', 't-prompt'); sbTerm.write('python ' + f.name + '\n');
    await wait(16);
    bridgeTarget = {
      inputs: sbState.inputs,
      write: function (s, kind) { sbTerm.write(s, kind === 'err' ? 't-err' : kind === 'in' ? 't-in' : null); }
    };
    var status;
    try {
      syncFiles(py);
      status = py.globals.get('_run_user')(f.code, f.name, RUN_LIMIT_SEC, sbState.seed);
    } catch (e) {
      status = 'error:Internal';
      sbTerm.write(String(e), 't-err');
    }
    sbState.running = false;
    sbRunBtn.disabled = false;
    lastRun.status = status;

    if (status === 'need_input') {
      sbTerm.state('\u0E23\u0E2D\u0E23\u0E31\u0E1A input', 'wait');
      sbTerm.askInput(function (v) { sbState.inputs.push(v); sandboxRun(false); });
      return;
    }
    if (status === 'ok') {
      sbTerm.newline();
      sbTerm.write('[Process exited with code 0]\n', 't-info');
    } else if (status === 'timeout') {
      sbTerm.newline();
      sbTerm.write('\u0E2B\u0E22\u0E38\u0E14\u0E01\u0E32\u0E23\u0E17\u0E33\u0E07\u0E32\u0E19: \u0E42\u0E04\u0E49\u0E14\u0E43\u0E0A\u0E49\u0E40\u0E27\u0E25\u0E32\u0E19\u0E32\u0E19\u0E40\u0E01\u0E34\u0E19 ' + RUN_LIMIT_SEC + ' \u0E27\u0E34\u0E19\u0E32\u0E17\u0E35 (\u0E2D\u0E32\u0E08\u0E21\u0E35\u0E25\u0E39\u0E1B\u0E44\u0E21\u0E48\u0E23\u0E39\u0E49\u0E08\u0E1A)\n', 't-err');
      sbTerm.state('\u0E2B\u0E21\u0E14\u0E40\u0E27\u0E25\u0E32', 'err');
    } else {
      var type = String(status).split(':')[1];
      sbTerm.newline();
      if (ERROR_TIPS[type]) sbTerm.write('\u0E04\u0E33\u0E41\u0E19\u0E30\u0E19\u0E33: ' + ERROR_TIPS[type] + '\n', 't-hint');
      sbTerm.write('[Process exited with code 1]\n', 't-info');
      sbTerm.state('\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14', 'err');
    }
    sbTerm.prompt();
  }
  sbRunBtn.addEventListener('click', function () { sandboxRun(true); });

  /* ================================================================ AI Shifu */
  var ai = { sample: null, ready: null, off: false, busy: false, history: [] };
  var aiLog = $('#ai-log');
  var AI_RULES = [
    '\u0E04\u0E38\u0E13\u0E04\u0E37\u0E2D "AI Shifu" \u0E1C\u0E39\u0E49\u0E0A\u0E48\u0E27\u0E22\u0E2A\u0E2D\u0E19\u0E40\u0E02\u0E35\u0E22\u0E19\u0E42\u0E1B\u0E23\u0E41\u0E01\u0E23\u0E21 Python \u0E43\u0E19\u0E40\u0E27\u0E47\u0E1A PIKO \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E19\u0E31\u0E01\u0E28\u0E36\u0E01\u0E29\u0E32\u0E27\u0E34\u0E28\u0E27\u0E01\u0E23\u0E23\u0E21\u0E04\u0E2D\u0E21\u0E1E\u0E34\u0E27\u0E40\u0E15\u0E2D\u0E23\u0E4C \u0E21\u0E2B\u0E32\u0E27\u0E34\u0E17\u0E22\u0E32\u0E25\u0E31\u0E22\u0E40\u0E17\u0E04\u0E42\u0E19\u0E42\u0E25\u0E22\u0E35\u0E2A\u0E38\u0E23\u0E19\u0E32\u0E23\u0E35',
    '\u0E15\u0E2D\u0E1A\u0E40\u0E1B\u0E47\u0E19\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22 \u0E2A\u0E38\u0E20\u0E32\u0E1E \u0E40\u0E1B\u0E47\u0E19\u0E01\u0E31\u0E19\u0E40\u0E2D\u0E07 \u0E2A\u0E31\u0E49\u0E19\u0E41\u0E25\u0E30\u0E15\u0E23\u0E07\u0E1B\u0E23\u0E30\u0E40\u0E14\u0E47\u0E19 (\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13 120 \u0E04\u0E33 \u0E40\u0E27\u0E49\u0E19\u0E41\u0E15\u0E48\u0E16\u0E39\u0E01\u0E02\u0E2D\u0E43\u0E2B\u0E49\u0E2D\u0E18\u0E34\u0E1A\u0E32\u0E22\u0E17\u0E35\u0E25\u0E30\u0E1A\u0E23\u0E23\u0E17\u0E31\u0E14)',
    '\u0E04\u0E38\u0E13\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19 "\u0E42\u0E2B\u0E21\u0E14\u0E43\u0E1A\u0E49 \u0E44\u0E21\u0E48\u0E40\u0E09\u0E25\u0E22": \u0E2B\u0E49\u0E32\u0E21\u0E40\u0E02\u0E35\u0E22\u0E19\u0E42\u0E04\u0E49\u0E14\u0E40\u0E09\u0E25\u0E22\u0E17\u0E31\u0E49\u0E07\u0E42\u0E1B\u0E23\u0E41\u0E01\u0E23\u0E21\u0E2B\u0E23\u0E37\u0E2D\u0E41\u0E01\u0E49\u0E42\u0E04\u0E49\u0E14\u0E43\u0E2B\u0E49\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14 \u0E43\u0E2B\u0E49\u0E0A\u0E35\u0E49\u0E40\u0E25\u0E02\u0E1A\u0E23\u0E23\u0E17\u0E31\u0E14 \u0E2D\u0E18\u0E34\u0E1A\u0E32\u0E22\u0E2A\u0E32\u0E40\u0E2B\u0E15\u0E38 \u0E41\u0E25\u0E30\u0E43\u0E2B\u0E49\u0E04\u0E33\u0E43\u0E1A\u0E49\u0E2B\u0E23\u0E37\u0E2D\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E2A\u0E31\u0E49\u0E19\u0E46 \u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 1\u20132 \u0E1A\u0E23\u0E23\u0E17\u0E31\u0E14',
    '\u0E43\u0E0A\u0E49 `backtick` \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E42\u0E04\u0E49\u0E14\u0E2A\u0E31\u0E49\u0E19\u0E46 \u0E2B\u0E49\u0E32\u0E21\u0E43\u0E0A\u0E49\u0E2B\u0E31\u0E27\u0E02\u0E49\u0E2D markdown \u0E41\u0E25\u0E30\u0E2B\u0E49\u0E32\u0E21\u0E43\u0E0A\u0E49 code block \u0E22\u0E32\u0E27',
    '\u0E2D\u0E49\u0E32\u0E07\u0E16\u0E36\u0E07\u0E1A\u0E23\u0E23\u0E17\u0E31\u0E14\u0E14\u0E49\u0E27\u0E22\u0E40\u0E25\u0E02\u0E1A\u0E23\u0E23\u0E17\u0E31\u0E14\u0E15\u0E32\u0E21\u0E17\u0E35\u0E48\u0E01\u0E33\u0E01\u0E31\u0E1A\u0E44\u0E27\u0E49\u0E2B\u0E19\u0E49\u0E32\u0E42\u0E04\u0E49\u0E14',
    '\u0E16\u0E49\u0E32\u0E04\u0E33\u0E16\u0E32\u0E21\u0E44\u0E21\u0E48\u0E40\u0E01\u0E35\u0E48\u0E22\u0E27\u0E01\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E40\u0E02\u0E35\u0E22\u0E19\u0E42\u0E1B\u0E23\u0E41\u0E01\u0E23\u0E21 \u0E43\u0E2B\u0E49\u0E0A\u0E27\u0E19\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32\u0E17\u0E35\u0E48\u0E42\u0E04\u0E49\u0E14\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E2A\u0E38\u0E20\u0E32\u0E1E'
  ].join('\n');

  // ภาษาของคำตอบ AI ให้ตรงกับภาษาที่เลือกบนเว็บ
  function aiLangNote() {
    return (window.PIKO_LANG === 'en') ? '\n\nIMPORTANT: The learner is using the English interface. Write your whole reply in English (for JSON, write summary, title and text in English).' : '';
  }
  function aiRules() { return AI_RULES + aiLangNote(); }

  function aiContext() {
    var f = activeFile();
    var lines = f.code.split('\n');
    if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
    var numbered = lines.map(function (l, i) { return (i + 1) + '| ' + l; }).join('\n');
    var term = sbTerm.text();
    if (term.length > 3000) term = '\u2026' + term.slice(-3000);
    var others = store.files.filter(function (x) { return x !== f; }).map(function (x) { return x.name; });
    return '\u0E44\u0E1F\u0E25\u0E4C\u0E17\u0E35\u0E48\u0E40\u0E1B\u0E34\u0E14\u0E2D\u0E22\u0E39\u0E48: ' + f.name + (others.length ? ' (\u0E44\u0E1F\u0E25\u0E4C\u0E2D\u0E37\u0E48\u0E19\u0E43\u0E19\u0E42\u0E1B\u0E23\u0E40\u0E08\u0E01\u0E15\u0E4C: ' + others.join(', ') + ')' : '') +
      '\n\u0E42\u0E04\u0E49\u0E14 (\u0E40\u0E25\u0E02\u0E1A\u0E23\u0E23\u0E17\u0E31\u0E14| \u0E42\u0E04\u0E49\u0E14):\n' + (numbered || '(\u0E44\u0E1F\u0E25\u0E4C\u0E27\u0E48\u0E32\u0E07)') +
      '\n\n\u0E1C\u0E25\u0E43\u0E19 Terminal \u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14:\n' + (lastRun.status ? term : '(\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E19)');
  }
  function fmtAi(text) {
    return esc(text)
      .replace(/```(?:python)?\n?([\s\S]*?)```/g, function (_, c) { return '<code>' + c.replace(/\n+$/, '') + '</code>'; })
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  }
  function aiMsgUser(text) { aiLog.appendChild(el('div', { class: 'msg-user' }, text)); aiLog.scrollTop = aiLog.scrollHeight; }
  function aiMsgAi(html, thinking) {
    var m = el('div', { class: 'msg-ai' + (thinking ? ' thinking' : '') });
    var t = el('div', { class: 'txt' }); t.innerHTML = html; m.appendChild(t);
    aiLog.appendChild(m); aiLog.scrollTop = aiLog.scrollHeight;
    return m;
  }
  function setAiOff() {
    ai.off = true;
    $('#ai-off').hidden = false;
    $('#ai-avatar').classList.add('off');
    $all('#ai-chips button, #ai-form input, #ai-form button').forEach(function (b) { b.disabled = true; });
    $('#ai-check-top').disabled = true;
    $('#ai-check-top').title = 'AI Shifu \u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E40\u0E1B\u0E34\u0E14\u0E40\u0E27\u0E47\u0E1A\u0E19\u0E35\u0E49\u0E43\u0E19 Claude';
  }
  function setAiBusy(b) {
    ai.busy = b;
    $all('#ai-chips button, #ai-form button').forEach(function (x) { x.disabled = b || ai.off; });
    $('#ai-check-top').disabled = b || ai.off;
  }
  function aiFail(msgEl, e) {
    var code = e && e.code;
    var t = $('.txt', msgEl);
    msgEl.classList.remove('thinking');
    if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].indexOf(code) !== -1) {
      t.textContent = '\u0E22\u0E31\u0E07\u0E43\u0E0A\u0E49 AI Shifu \u0E43\u0E19\u0E2B\u0E19\u0E49\u0E32\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 (\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15\u0E43\u0E2B\u0E49\u0E43\u0E0A\u0E49 Claude)';
      setAiOff();
      return;
    }
    if (code === 'cancelled') { msgEl.remove(); return; }
    if (code === 'refused') t.textContent = '';
    else if (e && e.text) t.innerHTML = fmtAi(e.text);
    else if (!t.textContent || msgEl.dataset.placeholder) t.textContent = '';
    var msg = code === 'rate_limited' ? '\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E16\u0E35\u0E48\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B \u0E23\u0E2D\u0E2A\u0E31\u0E01\u0E04\u0E23\u0E39\u0E48\u0E41\u0E25\u0E49\u0E27\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E19\u0E30'
      : code === 'session_expired' ? '\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A Claude \u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07'
        : code === 'refused' ? 'AI Shifu \u0E15\u0E2D\u0E1A\u0E04\u0E33\u0E16\u0E32\u0E21\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 \u0E25\u0E2D\u0E07\u0E16\u0E32\u0E21\u0E41\u0E1A\u0E1A\u0E2D\u0E37\u0E48\u0E19\u0E14\u0E39\u0E19\u0E30'
          : code === 'prompt_too_large' ? '\u0E42\u0E04\u0E49\u0E14\u0E22\u0E32\u0E27\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A AI \u0E25\u0E2D\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E2A\u0E48\u0E27\u0E19\u0E17\u0E35\u0E48\u0E2A\u0E07\u0E2A\u0E31\u0E22'
            : code === 'invalid_json' ? 'AI \u0E15\u0E2D\u0E1A\u0E01\u0E25\u0E31\u0E1A\u0E43\u0E19\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E17\u0E35\u0E48\u0E2D\u0E48\u0E32\u0E19\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 \u0E25\u0E2D\u0E07\u0E01\u0E14\u0E15\u0E23\u0E27\u0E08\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07'
              : '\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E02\u0E31\u0E14\u0E02\u0E49\u0E2D\u0E07 \u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07';
    msgEl.appendChild(el('span', { class: 'err' }, msg));
  }
  async function getSample() {
    if (ai.off) return null;
    var s = ai.sample || await ai.ready;
    if (!s) { setAiOff(); return null; }
    return s;
  }

  async function aiAsk(question, shown) {
    if (ai.busy || ai.off) return;
    var s = await getSample(); if (!s) return;
    setAiBusy(true);
    aiMsgUser(shown || question);
    var m = aiMsgAi('AI Shifu \u0E01\u0E33\u0E25\u0E31\u0E07\u0E04\u0E34\u0E14\u2026', true); m.dataset.placeholder = '1';
    var turns = ai.history.slice(-8);
    turns = turns.concat([{ role: 'user', content: aiRules() + '\n\n=== \u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E42\u0E04\u0E49\u0E14\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19 ===\n' + aiContext() + '\n\n=== \u0E04\u0E33\u0E16\u0E32\u0E21\u0E02\u0E2D\u0E07\u0E1C\u0E39\u0E49\u0E40\u0E23\u0E35\u0E22\u0E19 ===\n' + question }]);
    var t = $('.txt', m);
    try {
      var res = await s(turns, {
        cache: false,
        onText: function (u) { m.classList.remove('thinking'); delete m.dataset.placeholder; t.innerHTML = fmtAi(u.text); aiLog.scrollTop = aiLog.scrollHeight; }
      });
      m.classList.remove('thinking');
      t.innerHTML = fmtAi(res.text);
      if (res.truncated) m.appendChild(el('span', { class: 'err' }, '(\u0E04\u0E33\u0E15\u0E2D\u0E1A\u0E22\u0E32\u0E27\u0E40\u0E01\u0E34\u0E19 \u0E16\u0E39\u0E01\u0E15\u0E31\u0E14\u0E1A\u0E32\u0E07\u0E2A\u0E48\u0E27\u0E19)'));
      ai.history.push({ role: 'user', content: question }, { role: 'assistant', content: res.text });
    } catch (e) { aiFail(m, e); }
    setAiBusy(false);
  }

  var CHECK_SYMBOL = { ok: '\u2713', warn: '!', bad: '\u2717', tip: 'i' };
  async function aiCheck() {
    if (ai.busy || ai.off) return;
    var s = await getSample(); if (!s) return;
    if (!activeFile().code.trim()) { aiMsgAi('\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E42\u0E04\u0E49\u0E14\u0E43\u0E2B\u0E49\u0E15\u0E23\u0E27\u0E08 \u0E25\u0E2D\u0E07\u0E40\u0E02\u0E35\u0E22\u0E19\u0E42\u0E04\u0E49\u0E14\u0E2A\u0E31\u0E01\u0E2B\u0E19\u0E48\u0E2D\u0E22\u0E01\u0E48\u0E2D\u0E19\u0E19\u0E30'); return; }
    setAiBusy(true);
    aiMsgUser('\u0E15\u0E23\u0E27\u0E08\u0E42\u0E04\u0E49\u0E14\u0E19\u0E35\u0E49\u0E43\u0E2B\u0E49\u0E2B\u0E19\u0E48\u0E2D\u0E22');
    var m = aiMsgAi('\u0E01\u0E33\u0E25\u0E31\u0E07\u0E15\u0E23\u0E27\u0E08\u0E42\u0E04\u0E49\u0E14\u2026', true); m.dataset.placeholder = '1';
    var prompt = aiRules() + '\n\n=== \u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E42\u0E04\u0E49\u0E14\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19 ===\n' + aiContext() +
      '\n\n=== \u0E07\u0E32\u0E19 ===\n\u0E15\u0E23\u0E27\u0E08\u0E42\u0E04\u0E49\u0E14\u0E19\u0E35\u0E49: \u0E2B\u0E32\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14 (syntax / runtime \u0E40\u0E0A\u0E48\u0E19 ValueError \u0E08\u0E32\u0E01 input / \u0E15\u0E23\u0E23\u0E01\u0E30) \u0E08\u0E38\u0E14\u0E17\u0E35\u0E48\u0E04\u0E27\u0E23\u0E1B\u0E23\u0E31\u0E1A \u0E41\u0E25\u0E30\u0E2A\u0E34\u0E48\u0E07\u0E17\u0E35\u0E48\u0E17\u0E33\u0E44\u0E14\u0E49\u0E14\u0E35 \u0E42\u0E14\u0E22\u0E44\u0E21\u0E48\u0E40\u0E09\u0E25\u0E22\u0E42\u0E04\u0E49\u0E14' +
      '\n\u0E15\u0E2D\u0E1A\u0E40\u0E1B\u0E47\u0E19 JSON \u0E2D\u0E22\u0E48\u0E32\u0E07\u0E40\u0E14\u0E35\u0E22\u0E27\u0E43\u0E19\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A:' +
      '\n{"status":"ok|warn|bad","summary":"\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E31\u0E49\u0E19\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 6 \u0E04\u0E33 \u0E40\u0E0A\u0E48\u0E19 \u0E23\u0E31\u0E19\u0E44\u0E14\u0E49 \u00B7 \u0E04\u0E27\u0E23\u0E1B\u0E23\u0E31\u0E1A 1 \u0E08\u0E38\u0E14","items":[{"type":"ok|warn|bad|tip","line":\u0E40\u0E25\u0E02\u0E1A\u0E23\u0E23\u0E17\u0E31\u0E14\u0E2B\u0E23\u0E37\u0E2Dnull,"title":"\u0E2B\u0E31\u0E27\u0E02\u0E49\u0E2D\u0E2A\u0E31\u0E49\u0E19 \u0E40\u0E0A\u0E48\u0E19 \u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 / \u0E1A\u0E23\u0E23\u0E17\u0E31\u0E14 10 / \u0E25\u0E2D\u0E07\u0E15\u0E48\u0E2D\u0E22\u0E2D\u0E14","text":"\u0E04\u0E33\u0E2D\u0E18\u0E34\u0E1A\u0E32\u0E22 1\u20132 \u0E1B\u0E23\u0E30\u0E42\u0E22\u0E04 \u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22"}]}' +
      '\nstatus: bad = \u0E23\u0E31\u0E19\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E2B\u0E23\u0E37\u0E2D\u0E1C\u0E34\u0E14, warn = \u0E23\u0E31\u0E19\u0E44\u0E14\u0E49\u0E41\u0E15\u0E48\u0E04\u0E27\u0E23\u0E1B\u0E23\u0E31\u0E1A, ok = \u0E14\u0E35\u0E41\u0E25\u0E49\u0E27 \u00B7 items 2\u20134 \u0E02\u0E49\u0E2D \u0E40\u0E23\u0E35\u0E22\u0E07\u0E08\u0E32\u0E01\u0E2A\u0E33\u0E04\u0E31\u0E0D\u0E17\u0E35\u0E48\u0E2A\u0E38\u0E14' + aiLangNote();
    try {
      var r = await s.json(prompt, {});
      renderCheck(m, r);
    } catch (e) { aiFail(m, e); }
    setAiBusy(false);
  }
  function renderCheck(m, r) {
    m.classList.remove('thinking'); m.innerHTML = '';
    if (!r || typeof r !== 'object' || !Array.isArray(r.items)) {
      m.appendChild(el('div', { class: 'txt' }, '\u0E2D\u0E48\u0E32\u0E19\u0E1C\u0E25\u0E15\u0E23\u0E27\u0E08\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 \u0E25\u0E2D\u0E07\u0E01\u0E14\u0E15\u0E23\u0E27\u0E08\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07\u0E19\u0E30'));
      return;
    }
    var status = ['ok', 'warn', 'bad'].indexOf(r.status) !== -1 ? r.status : 'warn';
    var head = el('div', { class: 'check-head' });
    head.appendChild(el('b', null, '\u0E1C\u0E25\u0E15\u0E23\u0E27\u0E08\u0E42\u0E04\u0E49\u0E14'));
    head.appendChild(el('span', { class: 'check-badge' + (status === 'ok' ? '' : ' ' + status) }, String(r.summary || (status === 'ok' ? '\u0E14\u0E35\u0E41\u0E25\u0E49\u0E27' : '\u0E04\u0E27\u0E23\u0E1B\u0E23\u0E31\u0E1A')).slice(0, 40)));
    m.appendChild(head);
    var target = null, summaryText = [];
    r.items.slice(0, 5).forEach(function (it) {
      if (!it) return;
      var type = CHECK_SYMBOL[it.type] ? it.type : 'tip';
      var line = parseInt(it.line, 10);
      line = line >= 1 && line <= sbEditor.lineCount ? line : null;
      var row = el('div', { class: 'check-item ' + type });
      row.appendChild(el('span', { class: 'd', 'aria-hidden': 'true' }, CHECK_SYMBOL[type]));
      var body = el('span');
      body.innerHTML = '<b>' + esc(it.title || (line ? '\u0E1A\u0E23\u0E23\u0E17\u0E31\u0E14 ' + line : '')) + (it.title || line ? ':</b> ' : '</b>') + fmtAi(String(it.text || ''));
      row.appendChild(body);
      m.appendChild(row);
      summaryText.push('- ' + (it.title || '') + ': ' + (it.text || ''));
      if (!target && line && (type === 'bad' || type === 'warn')) target = { line: line, title: it.title, text: String(it.text || '') };
    });
    var acts = el('div', { class: 'check-actions' });
    var more = el('button', { type: 'button', class: 'btn btn-orange btn-sm' }, '\u0E02\u0E2D\u0E04\u0E33\u0E43\u0E1A\u0E49\u0E40\u0E1E\u0E34\u0E48\u0E21');
    more.addEventListener('click', function () {
      aiAsk('\u0E02\u0E2D\u0E04\u0E33\u0E43\u0E1A\u0E49\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E2D\u0E35\u0E01\u0E19\u0E34\u0E14' + (target ? '\u0E40\u0E01\u0E35\u0E48\u0E22\u0E27\u0E01\u0E31\u0E1A\u0E1A\u0E23\u0E23\u0E17\u0E31\u0E14 ' + target.line + ' (' + target.text + ')' : '\u0E08\u0E32\u0E01\u0E1C\u0E25\u0E15\u0E23\u0E27\u0E08\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14') + ' \u0E42\u0E14\u0E22\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E09\u0E25\u0E22\u0E42\u0E04\u0E49\u0E14', '\u0E02\u0E2D\u0E04\u0E33\u0E43\u0E1A\u0E49\u0E40\u0E1E\u0E34\u0E48\u0E21');
    });
    acts.appendChild(more);
    if (target) {
      var go = el('button', { type: 'button', class: 'btn btn-light btn-sm' }, '\u0E44\u0E1B\u0E17\u0E35\u0E48\u0E1A\u0E23\u0E23\u0E17\u0E31\u0E14 ' + target.line);
      go.addEventListener('click', function () { showTarget(target); });
      acts.appendChild(go);
      showTarget(target, true);
    } else sbEditor.clearMark();
    m.appendChild(acts);
    aiLog.scrollTop = aiLog.scrollHeight;
    ai.history.push({ role: 'user', content: '\u0E15\u0E23\u0E27\u0E08\u0E42\u0E04\u0E49\u0E14\u0E19\u0E35\u0E49\u0E43\u0E2B\u0E49\u0E2B\u0E19\u0E48\u0E2D\u0E22' }, { role: 'assistant', content: '\u0E1C\u0E25\u0E15\u0E23\u0E27\u0E08\u0E42\u0E04\u0E49\u0E14: ' + (r.summary || '') + '\n' + summaryText.join('\n') });
  }
  function showTarget(t, noFocus) {
    sbEditor.markLine(t.line, '<b>AI Shifu \u00B7 \u0E1A\u0E23\u0E23\u0E17\u0E31\u0E14 ' + t.line + '</b><br>' + fmtAi(t.text));
    if (!noFocus) sbEditor.gotoLine(t.line);
  }

  // \u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19 AI
  if (window.claude && typeof window.claude.use === 'function') {
    ai.ready = claudeUse('sample').then(function (s) { ai.sample = s; if (!s) setAiOff(); return s; });
    aiMsgAi('\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35! \u0E1C\u0E21\u0E04\u0E37\u0E2D AI Shifu \u0E0A\u0E48\u0E27\u0E22\u0E15\u0E23\u0E27\u0E08\u0E42\u0E04\u0E49\u0E14\u0E41\u0E25\u0E30\u0E43\u0E2B\u0E49\u0E04\u0E33\u0E43\u0E1A\u0E49\u0E44\u0E14\u0E49 (\u0E44\u0E21\u0E48\u0E40\u0E09\u0E25\u0E22\u0E19\u0E30) \u0E25\u0E2D\u0E07\u0E01\u0E14 <b>\u0E15\u0E23\u0E27\u0E08\u0E42\u0E04\u0E49\u0E14\u0E19\u0E35\u0E49</b> \u0E2B\u0E23\u0E37\u0E2D\u0E1E\u0E34\u0E21\u0E1E\u0E4C\u0E16\u0E32\u0E21\u0E44\u0E14\u0E49\u0E40\u0E25\u0E22');
  } else {
    ai.ready = Promise.resolve(null);
    setAiOff();
  }
  $('#ai-check-top').addEventListener('click', aiCheck);
  $all('#ai-chips button').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-ai');
      if (k === 'check') aiCheck();
      else if (k === 'explain') aiAsk('\u0E0A\u0E48\u0E27\u0E22\u0E2D\u0E18\u0E34\u0E1A\u0E32\u0E22\u0E42\u0E04\u0E49\u0E14\u0E19\u0E35\u0E49\u0E17\u0E35\u0E25\u0E30\u0E1A\u0E23\u0E23\u0E17\u0E31\u0E14 (\u0E2B\u0E23\u0E37\u0E2D\u0E17\u0E35\u0E25\u0E30\u0E01\u0E25\u0E38\u0E48\u0E21\u0E1A\u0E23\u0E23\u0E17\u0E31\u0E14) \u0E43\u0E2B\u0E49\u0E40\u0E02\u0E49\u0E32\u0E43\u0E08\u0E07\u0E48\u0E32\u0E22 \u0E15\u0E2D\u0E1A\u0E44\u0E14\u0E49\u0E22\u0E32\u0E27\u0E02\u0E36\u0E49\u0E19\u0E41\u0E15\u0E48\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13 250 \u0E04\u0E33', '\u0E2D\u0E18\u0E34\u0E1A\u0E32\u0E22\u0E17\u0E35\u0E25\u0E30\u0E1A\u0E23\u0E23\u0E17\u0E31\u0E14');
      else if (k === 'why') aiAsk(lastRun.status && lastRun.status.indexOf('error') === 0 || lastRun.status === 'timeout'
        ? '\u0E17\u0E33\u0E44\u0E21\u0E42\u0E04\u0E49\u0E14\u0E16\u0E36\u0E07 error \u0E15\u0E32\u0E21\u0E17\u0E35\u0E48\u0E40\u0E2B\u0E47\u0E19\u0E43\u0E19 Terminal? \u0E2D\u0E18\u0E34\u0E1A\u0E32\u0E22\u0E2A\u0E32\u0E40\u0E2B\u0E15\u0E38\u0E41\u0E25\u0E30\u0E1A\u0E2D\u0E01\u0E43\u0E1A\u0E49\u0E27\u0E34\u0E18\u0E35\u0E41\u0E01\u0E49 (\u0E44\u0E21\u0E48\u0E40\u0E09\u0E25\u0E22)'
        : '\u0E15\u0E2D\u0E19\u0E19\u0E35\u0E49\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E40\u0E2B\u0E47\u0E19 error \u0E43\u0E19 Terminal \u0E0A\u0E48\u0E27\u0E22\u0E14\u0E39\u0E27\u0E48\u0E32\u0E42\u0E04\u0E49\u0E14\u0E19\u0E35\u0E49\u0E21\u0E35\u0E08\u0E38\u0E14\u0E44\u0E2B\u0E19\u0E17\u0E35\u0E48\u0E2D\u0E32\u0E08\u0E17\u0E33\u0E43\u0E2B\u0E49\u0E40\u0E01\u0E34\u0E14 error \u0E44\u0E14\u0E49\u0E1A\u0E49\u0E32\u0E07 (\u0E40\u0E0A\u0E48\u0E19 \u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E1E\u0E34\u0E21\u0E1E\u0E4C) \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E04\u0E33\u0E43\u0E1A\u0E49', '\u0E17\u0E33\u0E44\u0E21\u0E16\u0E36\u0E07 error?');
    });
  });
  $('#ai-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var inp = $('#ai-ask'), q = inp.value.trim();
    if (!q || ai.busy) return;
    inp.value = '';
    aiAsk(q);
  });

  /* ================================================================ Exercises */
  var LEVEL_CLASS = { '\u0E07\u0E48\u0E32\u0E22': 'level-easy', '\u0E01\u0E25\u0E32\u0E07': 'level-mid', '\u0E22\u0E32\u0E01': 'level-hard' };
  var exFilter = { level: 'all', q: '' };
  var exCurrent = null;
  var exEditor = createEditor($('#ex-editor'), { filename: 'solution.py', value: '' });
  exEditor.actions.innerHTML =
    '<button type="button" class="btn btn-ghost-dark btn-sm" id="ex-sample">\u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07 <span class="kbd" style="background:rgba(255,255,255,.14)">F5</span></button>' +
    '<button type="button" class="btn btn-sky btn-sm" id="ex-submit">\u0E2A\u0E48\u0E07\u0E04\u0E33\u0E15\u0E2D\u0E1A</button>';
  exEditor.setLabel('solution.py');
  exEditor.onChange(function (v) { if (exCurrent) { store.code[exCurrent.id] = v; store.codeAt[exCurrent.id] = Date.now(); save(); } });

  // \u0E41\u0E2A\u0E14\u0E07\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E23\u0E31\u0E19 \u0E42\u0E14\u0E22\u0E17\u0E33\u0E15\u0E31\u0E27\u0E2B\u0E19\u0E32/\u0E40\u0E2D\u0E35\u0E22\u0E07/\u0E02\u0E35\u0E14\u0E40\u0E2A\u0E49\u0E19\u0E43\u0E15\u0E49\u0E43\u0E2B\u0E49\u0E04\u0E48\u0E32\u0E17\u0E35\u0E48\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E1E\u0E34\u0E21\u0E1E\u0E4C
  function transcriptHtml(text, inputs) {
    var s = String(text), html = '', pos = 0;
    (inputs || []).forEach(function (v) {
      v = String(v);
      if (!v) return;
      var re = new RegExp(escRe(v) + '(?=\\n|$)', 'g');
      re.lastIndex = pos;
      var m = re.exec(s);
      if (m) { html += esc(s.slice(pos, m.index)) + '<b>' + esc(v) + '</b>'; pos = m.index + v.length; }
    });
    return html + esc(s.slice(pos));
  }

  function solvedCount() { return EXERCISES.filter(function (x) { return store.solved[x.id]; }).length; }
  function nextUnsolved() {
    var start = Math.max(0, EXERCISES.findIndex(function (x) { return x.id === store.current; }));
    for (var k = 0; k < EXERCISES.length; k++) {
      var x = EXERCISES[(start + k) % EXERCISES.length];
      if (!store.solved[x.id]) return x;
    }
    return null;
  }

  function renderProgress() {
    var n = solvedCount(), total = EXERCISES.length, pct = total ? Math.round(n / total * 100) : 0;
    var p = $('#ex-progress'); p.setAttribute('aria-valuenow', pct); $('span', p).style.width = pct + '%';
    $('#ex-progress-txt').textContent = '\u0E1C\u0E48\u0E32\u0E19 ' + n + '/' + total;

    var next = nextUnsolved();
    var nextIdx = next ? EXERCISES.indexOf(next) : -1;
    var cheer = n === 0 ? '\u0E40\u0E23\u0E34\u0E48\u0E21\u0E02\u0E49\u0E2D\u0E41\u0E23\u0E01\u0E01\u0E31\u0E19\u0E40\u0E25\u0E22' : n === total ? '\u0E17\u0E33\u0E04\u0E23\u0E1A\u0E17\u0E38\u0E01\u0E02\u0E49\u0E2D\u0E41\u0E25\u0E49\u0E27 \u0E40\u0E01\u0E48\u0E07\u0E21\u0E32\u0E01!' : n >= total / 2 ? '\u0E2D\u0E35\u0E01\u0E19\u0E34\u0E14\u0E40\u0E14\u0E35\u0E22\u0E27\u0E01\u0E47\u0E04\u0E23\u0E1A\u0E41\u0E25\u0E49\u0E27' : '\u0E04\u0E48\u0E2D\u0E22\u0E46 \u0E17\u0E33\u0E44\u0E1B\u0E17\u0E35\u0E25\u0E30\u0E02\u0E49\u0E2D\u0E19\u0E30';
    $('#continue-count').textContent = '\u0E1C\u0E48\u0E32\u0E19\u0E41\u0E25\u0E49\u0E27 ' + n + ' \u0E08\u0E32\u0E01 ' + total + ' \u0E02\u0E49\u0E2D \u00B7 ' + cheer;
    if (next) {
      $('#continue-label').textContent = n === 0 ? '\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19\u0E17\u0E35\u0E48\u0E02\u0E49\u0E2D\u0E41\u0E23\u0E01' : '\u0E17\u0E33\u0E15\u0E48\u0E2D\u0E08\u0E32\u0E01\u0E17\u0E35\u0E48\u0E04\u0E49\u0E32\u0E07\u0E44\u0E27\u0E49';
      $('#continue-title').textContent = '\u0E02\u0E49\u0E2D ' + (nextIdx + 1) + ' \u00B7 ' + next.title;
      $('#continue-num').textContent = nextIdx + 1;
      $('#continue-btn-txt').textContent = n === 0 ? '\u0E40\u0E23\u0E34\u0E48\u0E21\u0E40\u0E25\u0E22' : '\u0E17\u0E33\u0E15\u0E48\u0E2D\u0E40\u0E25\u0E22';
      $('#continue-btn').setAttribute('href', '#exercises.' + next.id);
    } else {
      $('#continue-label').textContent = '\u0E17\u0E33\u0E04\u0E23\u0E1A\u0E41\u0E25\u0E49\u0E27';
      $('#continue-title').textContent = '\u0E1C\u0E48\u0E32\u0E19\u0E04\u0E23\u0E1A\u0E17\u0E31\u0E49\u0E07 ' + total + ' \u0E02\u0E49\u0E2D';
      $('#continue-num').textContent = '\u2713';
      $('#continue-btn-txt').textContent = '\u0E17\u0E1A\u0E17\u0E27\u0E19\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07';
      $('#continue-btn').setAttribute('href', '#exercises');
    }

    var track = $('#continue-track'); track.innerHTML = '';
    track.appendChild(el('span', { class: 'line', 'aria-hidden': 'true' }));
    track.appendChild(el('span', { class: 'fill', 'aria-hidden': 'true' }));
    EXERCISES.forEach(function (x, i) {
      var kind = store.solved[x.id] ? 'done' : (i === nextIdx ? 'now' : 'todo');
      var a = el('a', { class: 'step ' + kind, href: '#exercises.' + x.id, 'aria-label': '\u0E02\u0E49\u0E2D ' + (i + 1) + ' ' + x.title + (kind === 'done' ? ' (\u0E1C\u0E48\u0E32\u0E19\u0E41\u0E25\u0E49\u0E27)' : kind === 'now' ? ' (\u0E01\u0E33\u0E25\u0E31\u0E07\u0E17\u0E33)' : '') });
      a.appendChild(el('span', { class: 'c', 'aria-hidden': 'true' }, kind === 'done' ? '\u2713' : String(i + 1)));
      a.appendChild(el('small', { 'aria-hidden': 'true' }, kind === 'now' ? '\u0E01\u0E33\u0E25\u0E31\u0E07\u0E17\u0E33' : '\u0E02\u0E49\u0E2D ' + (i + 1)));
      track.appendChild(a);
    });
    layoutTrack();
  }
  function layoutTrack() {
    var track = $('#continue-track'); if (!track || !track.offsetWidth) return;
    var steps = $all('.step', track); if (!steps.length) return;
    var center = function (s) { return s.offsetLeft + s.offsetWidth / 2; };
    var first = center(steps[0]), last = center(steps[steps.length - 1]);
    var line = $('.line', track), fill = $('.fill', track);
    line.style.left = first + 'px'; line.style.width = Math.max(0, last - first) + 'px';
    var reach = -1;
    steps.forEach(function (s, i) { if (s.classList.contains('done') || s.classList.contains('now')) reach = i; });
    fill.style.left = first + 'px';
    fill.style.width = reach > 0 ? (center(steps[reach]) - first) + 'px' : '0px';
  }
  window.addEventListener('resize', layoutTrack);

  function renderList() {
    var list = $('#ex-list'); list.innerHTML = '';
    var q = exFilter.q.trim().toLowerCase();
    var shown = 0;
    EXERCISES.forEach(function (x, i) {
      if (exFilter.level !== 'all' && x.level !== exFilter.level) return;
      if (q && (x.title + ' ' + x.topic + ' ' + x.id).toLowerCase().indexOf(q) === -1) return;
      shown++;
      var li = el('li');
      var b = el('button', { type: 'button', class: 'ex-item' + (store.solved[x.id] ? ' done' : '') });
      if (exCurrent && exCurrent.id === x.id) b.setAttribute('aria-current', 'true');
      b.innerHTML = '<span class="ex-badge" aria-hidden="true">' + (store.solved[x.id] ? '\u2713' : (i + 1)) + '</span>' +
        '<span class="txt"><b>' + esc(x.title) + '</b><small>' + esc(x.topic) + (store.solved[x.id] ? ' \u00B7 \u0E1C\u0E48\u0E32\u0E19\u0E41\u0E25\u0E49\u0E27' : '') + '</small></span>' +
        '<span class="level ' + LEVEL_CLASS[x.level] + '">' + esc(x.level) + '</span>';
      b.addEventListener('click', function () { location.hash = '#exercises.' + x.id; });
      li.appendChild(b); list.appendChild(li);
    });
    if (!shown) {
      var em = el('li', { class: 'empty' });
      em.innerHTML = '<b>\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E42\u0E08\u0E17\u0E22\u0E4C</b>\u0E25\u0E2D\u0E07\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E04\u0E33\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E01';
      list.appendChild(em);
    }
  }

  function selectExercise(id) {
    var x = EXERCISES.find(function (e) { return e.id === id; }) || EXERCISES.find(function (e) { return e.id === store.current; }) || EXERCISES[0];
    if (!x) return;
    var same = exCurrent && exCurrent.id === x.id;
    exCurrent = x; store.current = x.id; save();
    renderList();
    if (same) return;
    var idx = EXERCISES.indexOf(x) + 1;
    var lv = $('#prob-level'); lv.className = 'level ' + LEVEL_CLASS[x.level]; lv.textContent = x.level;
    $('#prob-topic').textContent = '\u0E02\u0E49\u0E2D ' + idx + ' \u00B7 ' + x.topic;
    $('#prob-title').textContent = x.title;
    $('#prob-desc').innerHTML = x.desc;
    var t0 = x.tests[0] || { inputs: [], expected: '' };
    $('#prob-sample').innerHTML = transcriptHtml(t0.expected, t0.inputs);
    exEditor.value = store.code[x.id] != null ? store.code[x.id] : x.starter;
    resetResults();
  }
  function resetResults() {
    var sc = $('#res-score'); sc.className = 'score'; sc.textContent = '\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E15\u0E23\u0E27\u0E08';
    $('#res-body').innerHTML = '<p class="muted">\u0E01\u0E14 \u201C\u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u201D \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E25\u0E2D\u0E07\u0E01\u0E31\u0E1A\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07 \u0E2B\u0E23\u0E37\u0E2D \u201C\u0E2A\u0E48\u0E07\u0E04\u0E33\u0E15\u0E2D\u0E1A\u201D \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E15\u0E23\u0E27\u0E08\u0E01\u0E31\u0E1A test case \u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14</p>';
  }

  var grading = false;
  async function grade(all) {
    if (grading || !exCurrent) return;
    grading = true;
    var btns = [$('#ex-sample'), $('#ex-submit')];
    btns.forEach(function (b) { b.disabled = true; });
    var body = $('#res-body'), sc = $('#res-score');
    sc.className = 'score'; sc.textContent = '\u0E01\u0E33\u0E25\u0E31\u0E07\u0E15\u0E23\u0E27\u0E08\u2026';
    var py;
    try {
      if (!pyPromise) body.innerHTML = '<p class="muted">\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14 Python \u0E04\u0E23\u0E31\u0E49\u0E07\u0E41\u0E23\u0E01 \u0E2D\u0E32\u0E08\u0E43\u0E0A\u0E49\u0E40\u0E27\u0E25\u0E32\u0E2A\u0E31\u0E01\u0E04\u0E23\u0E39\u0E48\u2026</p>';
      py = await ensurePy();
    } catch (e) {
      body.innerHTML = '<p class="err-box">\u0E42\u0E2B\u0E25\u0E14 Python \u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E2D\u0E34\u0E19\u0E40\u0E17\u0E2D\u0E23\u0E4C\u0E40\u0E19\u0E47\u0E15\u0E41\u0E25\u0E49\u0E27\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48</p>';
      sc.textContent = '\u0E15\u0E23\u0E27\u0E08\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49';
      grading = false; btns.forEach(function (b) { b.disabled = false; });
      return;
    }
    await wait(16);
    var x = exCurrent;
    var tests = all ? x.tests : x.tests.slice(0, x.sample);
    var res;
    try { res = JSON.parse(py.globals.get('_grade_io')(exEditor.value, JSON.stringify(tests), 3.0)); }
    catch (e) { res = { results: [{ ok: false, status: 'error', error: String(e), got: '', expected: '', inputs: [] }] }; }
    grading = false; btns.forEach(function (b) { b.disabled = false; });
    renderResults(res, all, x);
  }

  function renderResults(res, all, x) {
    var body = $('#res-body'), sc = $('#res-score');
    body.innerHTML = '';
    var rows = res.results || [];
    var pass = rows.filter(function (r) { return r.ok; }).length, total = rows.length;
    sc.className = 'score ' + (pass === total ? 'all' : 'some');
    sc.textContent = (all ? '' : '\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07: ') + '\u0E1C\u0E48\u0E32\u0E19 ' + pass + ' / ' + total + ' test case';
    var ul = el('ul', { class: 'results' });
    rows.forEach(function (r, i) {
      var li = el('li', { class: r.ok ? 'ok' : 'bad' });
      var head = el('div', { class: 'r-head' });
      head.appendChild(el('span', { class: 'mark' }, r.ok ? '\u2713 \u0E1C\u0E48\u0E32\u0E19' : '\u2717 \u0E44\u0E21\u0E48\u0E1C\u0E48\u0E32\u0E19'));
      head.appendChild(el('span', null, 'Test case ' + (i + 1)));
      if (r.inputs && r.inputs.length) head.appendChild(el('span', { class: 'r-in' }, 'input: ' + r.inputs.join(', ')));
      li.appendChild(head);
      if (r.status === 'error') {
        li.appendChild(el('pre', { class: 'err-box' }, r.error));
        if (ERROR_TIPS[r.error_type]) li.appendChild(el('p', { class: 'hint' }, '\u0E04\u0E33\u0E41\u0E19\u0E30\u0E19\u0E33: ' + ERROR_TIPS[r.error_type]));
      } else if (r.status === 'timeout') {
        li.appendChild(el('p', { class: 'hint' }, '\u0E42\u0E04\u0E49\u0E14\u0E43\u0E0A\u0E49\u0E40\u0E27\u0E25\u0E32\u0E19\u0E32\u0E19\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B (\u0E2D\u0E32\u0E08\u0E21\u0E35\u0E25\u0E39\u0E1B\u0E44\u0E21\u0E48\u0E23\u0E39\u0E49\u0E08\u0E1A) \u0E25\u0E2D\u0E07\u0E15\u0E23\u0E27\u0E08\u0E40\u0E07\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E02\u0E02\u0E2D\u0E07\u0E25\u0E39\u0E1B\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07'));
      } else if (r.status === 'need_input') {
        li.appendChild(el('p', { class: 'hint' }, '\u0E42\u0E1B\u0E23\u0E41\u0E01\u0E23\u0E21\u0E40\u0E23\u0E35\u0E22\u0E01 input() \u0E21\u0E32\u0E01\u0E01\u0E27\u0E48\u0E32\u0E17\u0E35\u0E48\u0E42\u0E08\u0E17\u0E22\u0E4C\u0E01\u0E33\u0E2B\u0E19\u0E14 (\u0E42\u0E08\u0E17\u0E22\u0E4C\u0E19\u0E35\u0E49\u0E23\u0E31\u0E1A\u0E04\u0E48\u0E32 ' + (r.inputs || []).length + ' \u0E04\u0E23\u0E31\u0E49\u0E07)'));
      }
      if (!r.ok && r.status !== 'timeout') {
        var cmp = el('div', { class: 'compare' });
        var a = el('div'); a.appendChild(el('small', null, '\u0E1C\u0E25\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23'));
        var pa = el('pre'); pa.innerHTML = transcriptHtml(r.expected, r.inputs); a.appendChild(pa);
        var b = el('div'); b.appendChild(el('small', null, '\u0E1C\u0E25\u0E08\u0E32\u0E01\u0E42\u0E04\u0E49\u0E14\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13'));
        var pb = el('pre'); pb.innerHTML = r.got ? transcriptHtml(r.got, r.inputs) : '<span class="muted">(\u0E44\u0E21\u0E48\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E2A\u0E14\u0E07\u0E1C\u0E25)</span>'; b.appendChild(pb);
        cmp.appendChild(a); cmp.appendChild(b);
        li.appendChild(cmp);
      }
      ul.appendChild(li);
    });
    body.appendChild(ul);
    if (all && pass === total && total) {
      var first = !store.solved[x.id];
      store.solved[x.id] = true; save();
      renderList(); renderProgress();
      var box = el('div', { class: 'success' });
      box.style.marginTop = '12px';
      box.appendChild(el('span', null, first ? '\u0E22\u0E2D\u0E14\u0E40\u0E22\u0E35\u0E48\u0E22\u0E21! \u0E1C\u0E48\u0E32\u0E19\u0E17\u0E38\u0E01 test case \u0E41\u0E25\u0E49\u0E27' : '\u0E1C\u0E48\u0E32\u0E19\u0E17\u0E38\u0E01 test case \u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07'));
      var nx = nextUnsolved();
      if (nx) box.appendChild(el('a', { class: 'btn btn-sky btn-sm', href: '#exercises.' + nx.id }, '\u0E02\u0E49\u0E2D\u0E16\u0E31\u0E14\u0E44\u0E1B: ' + nx.title + ' \u2192'));
      else box.appendChild(el('span', null, '\u0E17\u0E33\u0E04\u0E23\u0E1A\u0E17\u0E38\u0E01\u0E02\u0E49\u0E2D\u0E41\u0E25\u0E49\u0E27!'));
      body.appendChild(box);
    } else if (!all && pass === total && total) {
      body.appendChild(el('p', { class: 'muted', style: 'margin:12px 0 0' }, '\u0E1C\u0E48\u0E32\u0E19\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E41\u0E25\u0E49\u0E27 \u0E25\u0E2D\u0E07\u0E01\u0E14 \u201C\u0E2A\u0E48\u0E07\u0E04\u0E33\u0E15\u0E2D\u0E1A\u201D \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E15\u0E23\u0E27\u0E08\u0E01\u0E31\u0E1A test case \u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14'));
    }
  }

  $('#ex-sample').addEventListener('click', function () { grade(false); });
  $('#ex-submit').addEventListener('click', function () { grade(true); });
  $('#ex-search').addEventListener('input', function (e) { exFilter.q = e.target.value; renderList(); });
  $all('#ex-filters button').forEach(function (b) {
    b.addEventListener('click', function () {
      exFilter.level = b.getAttribute('data-level');
      $all('#ex-filters button').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      renderList();
    });
  });

  /* ================================================================ Router */
  var PAGES = ['home', 'sandbox', 'exercises'];
  var TITLES = { home: 'PIKO Python Lab', sandbox: 'Sandbox \u00B7 PIKO', exercises: '\u0E41\u0E1A\u0E1A\u0E1D\u0E36\u0E01\u0E2B\u0E31\u0E14 \u00B7 PIKO' };
  var currentPage = null;
  function route() {
    var h = (location.hash || '#home').slice(1).split('.');
    var page = PAGES.indexOf(h[0]) !== -1 ? h[0] : 'home';
    if (page !== currentPage) {
      $all('.page').forEach(function (p) { p.classList.toggle('is-active', p.getAttribute('data-page') === page); });
      $all('[data-nav]').forEach(function (a) {
        if (a.getAttribute('data-nav') === page) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
      document.body.setAttribute('data-page', page);
      document.title = TITLES[page];
      window.scrollTo(0, 0);
      currentPage = page;
      if (page === 'home') setTimeout(layoutTrack, 0);
    }
    if (page === 'exercises') selectExercise(h[1]);
    if (page !== 'home') ensurePy().catch(function () {});
  }
  window.addEventListener('hashchange', route);

  document.addEventListener('keydown', function (e) {
    var run = e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter');
    if (!run) return;
    if (currentPage === 'sandbox') { e.preventDefault(); sandboxRun(true); }
    else if (currentPage === 'exercises') { e.preventDefault(); grade(false); }
  });

  route();
  renderProgress();
  // \u0E40\u0E23\u0E34\u0E48\u0E21\u0E42\u0E2B\u0E25\u0E14 Python \u0E40\u0E1A\u0E37\u0E49\u0E2D\u0E07\u0E2B\u0E25\u0E31\u0E07 \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E2B\u0E49\u0E23\u0E31\u0E19\u0E44\u0E14\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E40\u0E02\u0E49\u0E32 Sandbox
  setTimeout(function () { ensurePy().catch(function () {}); }, 1200);
})();
