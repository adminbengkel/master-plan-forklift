/* =====================================================================
   auth-session.js — perilaku halaman login & sesi (dipisah dari index.html)
   1. Logout otomatis setelah 3 jam tanpa aktivitas.
   2. "Ingat Saya": email terisi otomatis; password diisi lewat penyimpanan
      password milik browser (Credential Management / autofill), BUKAN disimpan
      sebagai teks biasa oleh website.
   3. Interaksi halaman login: pindah panel Login/Reset, lihat password,
      slider gambar, dan reset password via email.
   Pasang SETELAH skrip utama di index.html:
      <script src="auth-session.js?v=1"></script>
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- Pengaturan ---------- */
  var CFG = {
    idleMs: 3 * 60 * 60 * 1000,      // batas tidak aktif: 3 jam
    checkEveryMs: 30 * 1000,         // seberapa sering dicek
    writeEveryMs: 15 * 1000,         // seberapa sering aktivitas dicatat
    idleMessage: 'Sesi berakhir karena tidak ada aktivitas selama 3 jam. Silakan masuk kembali.',
    events: ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'],
    slides: [
      { url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80', title: 'Manajemen Armada & Maintenance Terintegrasi' },
      { url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1200&q=80', title: 'Pemeliharaan Preventif Forklift & Kendaraan Berat' },
      { url: 'https://images.unsplash.com/photo-1504222490345-c075b6008014?auto=format&fit=crop&w=1200&q=80', title: 'Monitoring Real-Time Ketersediaan Sparepart' }
    ]
  };
  var K = { last: 'mbk_last_activity', email: 'mbk_remember_email', remember: 'mbk_remember_me', msg: 'mbk_session_msg' };

  function $(id) { return document.getElementById(id); }
  var ls = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { } }
  };
  function getAuth() { try { return typeof auth !== 'undefined' ? auth : null; } catch (e) { return null; } }
  function errText(e) {
    try { if (typeof friendlyAuthError === 'function') return friendlyAuthError(e); } catch (x) { }
    return 'Gagal: ' + (e && e.message || 'kesalahan tidak diketahui');
  }

  /* ---------- 1. Logout otomatis (idle) ---------- */
  var lastAct = Date.now(), lastWrite = 0, active = false, timer = null;

  function touch(force) {
    var n = Date.now(); lastAct = n;
    if (force || n - lastWrite >= CFG.writeEveryMs) { lastWrite = n; ls.set(K.last, String(n)); }
  }
  function idleFor() {                       // memakai aktivitas terbaru dari tab mana pun
    var shared = parseInt(ls.get(K.last), 10) || 0;
    return Date.now() - Math.max(lastAct, shared);
  }
  function expire() {
    if (!active) return;
    stop();
    ls.set(K.msg, CFG.idleMessage);
    var a = getAuth(); if (a) a.signOut().catch(function () { });
  }
  function check() { if (active && idleFor() >= CFG.idleMs) expire(); }
  function onActivity() { touch(false); }
  function start() {
    if (active) return;
    active = true; touch(true);
    CFG.events.forEach(function (ev) { window.addEventListener(ev, onActivity, { passive: true, capture: true }); });
    timer = setInterval(check, CFG.checkEveryMs);
  }
  function stop() {
    active = false; clearInterval(timer); timer = null;
    CFG.events.forEach(function (ev) { window.removeEventListener(ev, onActivity, { passive: true, capture: true }); });
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
  window.addEventListener('focus', check);

  function watchAuth() {
    var a = getAuth(); if (!a || !a.onAuthStateChanged) return;
    a.onAuthStateChanged(function (user) {
      if (user) {
        // sesi lama yang masih tersimpan di browser tetapi sudah > 3 jam tidak dipakai
        var shared = parseInt(ls.get(K.last), 10) || 0;
        if (shared && Date.now() - shared >= CFG.idleMs) { active = true; expire(); return; }
        start();
      } else {
        stop();
        var m = ls.get(K.msg);
        if (m) { ls.del(K.msg); setTimeout(function () { var el = $('authMsg'); if (el) el.textContent = m; }, 0); }
      }
    });
  }

  /* ---------- 2. Ingat Saya ---------- */
  function wantRemember() { var c = $('rememberMe'); return !!(c && c.checked); }

  function prefill() {
    if (ls.get(K.remember) !== '1') return;
    if ($('rememberMe')) $('rememberMe').checked = true;
    var em = ls.get(K.email); if (em && $('loginEmail')) $('loginEmail').value = em;
    // password: diambil dari penyimpanan password browser (tanpa dialog) bila tersedia
    if (navigator.credentials && window.PasswordCredential) {
      navigator.credentials.get({ password: true, mediation: 'silent' }).then(function (c) {
        if (c && c.type === 'password' && $('loginPassword') && !$('loginPassword').value &&
            (!$('loginEmail').value || c.id.toLowerCase() === $('loginEmail').value.toLowerCase())) {
          $('loginEmail').value = c.id; $('loginPassword').value = c.password;
        }
      }).catch(function () { });
    }
    if ($('loginPassword') && !$('loginPassword').value && em) { try { $('loginPassword').focus(); } catch (e) { } }
  }

  var Session = {
    config: CFG,
    // dipanggil index.html tepat sebelum login
    beforeLogin: function () {
      ls.set(K.last, String(Date.now())); lastAct = Date.now();      // mulai hitungan 3 jam dari login
      var a = getAuth();
      if (a && a.setPersistence && window.firebase && firebase.auth && firebase.auth.Auth) {
        var P = firebase.auth.Auth.Persistence;
        return a.setPersistence(wantRemember() ? P.LOCAL : P.SESSION).catch(function () { });
      }
      return Promise.resolve();
    },
    // dipanggil index.html setelah login berhasil
    afterLogin: function (email, password) {
      touch(true);
      if (wantRemember()) {
        ls.set(K.remember, '1'); ls.set(K.email, email);
        try {
          if (navigator.credentials && window.PasswordCredential)
            navigator.credentials.store(new PasswordCredential({ id: email, password: password, name: email })).catch(function () { });
        } catch (e) { }
      } else { ls.del(K.remember); ls.del(K.email); }
    }
  };
  window.MbkSession = Session;

  /* ---------- 3. Interaksi halaman login ---------- */
  function showPane(name) {
    var reset = name === 'reset';
    if ($('loginPane')) $('loginPane').hidden = reset;
    if ($('resetPane')) $('resetPane').hidden = !reset;
    if (reset) {
      if ($('resetEmail') && $('loginEmail')) $('resetEmail').value = $('loginEmail').value;
      if ($('resetMsg')) { $('resetMsg').textContent = ''; $('resetMsg').className = ''; }
      if ($('resetEmail')) $('resetEmail').focus();
    }
  }

  var slide = 0;
  function setSlide(i) {
    slide = (i + CFG.slides.length) % CFG.slides.length;
    var img = $('heroImg'), t = $('heroTitle'); if (!img || !t) return;
    img.style.opacity = '0.4';
    setTimeout(function () { img.style.display = ''; img.src = CFG.slides[slide].url; t.textContent = CFG.slides[slide].title; img.style.opacity = '1'; }, 180);
    Array.prototype.forEach.call(document.querySelectorAll('#heroDots button'), function (b, k) { b.className = k === slide ? 'on' : ''; });
  }

  function initUi() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-go]'), function (b) {
      b.addEventListener('click', function () { showPane(b.getAttribute('data-go')); });
    });
    var tg = $('togglePwd');
    if (tg) tg.addEventListener('click', function () {
      var p = $('loginPassword'), show = p.type === 'password';
      p.type = show ? 'text' : 'password';
      tg.innerHTML = '<i class="fa-regular ' + (show ? 'fa-eye-slash' : 'fa-eye') + '"></i>';
    });
    var dots = $('heroDots');
    if (dots) {
      dots.innerHTML = CFG.slides.map(function (_, i) { return '<button type="button" aria-label="Gambar ' + (i + 1) + '"></button>'; }).join('');
      Array.prototype.forEach.call(dots.children, function (b, i) { b.addEventListener('click', function () { setSlide(i); }); });
      setSlide(0);
    }
    if ($('heroNext')) $('heroNext').addEventListener('click', function () { setSlide(slide + 1); });

    var rf = $('resetForm');
    if (rf) rf.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = $('resetMsg'), email = $('resetEmail').value.trim(), a = getAuth();
      msg.className = '';
      if (!email) { msg.textContent = 'Isi email terlebih dahulu.'; return; }
      if (!a) { msg.textContent = 'Layanan login belum tersambung.'; return; }
      $('resetBtn').disabled = true; msg.textContent = 'Mengirim…';
      a.sendPasswordResetEmail(email).then(function () {
        msg.className = 'ok'; msg.textContent = 'Tautan reset password telah dikirim ke ' + email + '.';
        setTimeout(function () { showPane('login'); }, 2500);
      }).catch(function (err) { msg.textContent = errText(err); })
        .then(function () { $('resetBtn').disabled = false; });
    });
    prefill();
  }

  function init() { initUi(); watchAuth(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
