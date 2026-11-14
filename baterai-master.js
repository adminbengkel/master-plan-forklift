/* Master Data > Data Baterai
   Logika tampilan terpisah dari index.html. Data dibaca dari window.MBK_BATTERY_DATA (data-baterai.js).
   Dipanggil oleh setActiveView('batteries') lewat window.mbkRenderBatteries().
   Edit: disimpan di collection 'laju' (dokumen battery_<No>) seperti edit info unit; fallback localStorage bila offline. */
(function () {
  'use strict';
  var PAGE_SIZE = 25;
  var page = 1;
  var inited = false;

  function $(id) { return document.getElementById(id); }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var FIELDS = ['kode', 'merk', 'type', 'spek', 'tgl', 'serial', 'ket', 'dimensi', 'berat', 'kondisi'];
  var LOCAL_KEY = 'mbk_battery_info_v1';
  function baseData() { return Array.isArray(window.MBK_BATTERY_DATA) ? window.MBK_BATTERY_DATA : []; }
  function docId(no) { return 'battery_' + no; }
  function dbRef() { try { return typeof db !== 'undefined' ? db : null; } catch (e) { return null; } }
  function sharedDocs() { try { return typeof lshared !== 'undefined' && lshared ? lshared : {}; } catch (e) { return {}; } }
  function role() { try { return typeof currentRole !== 'undefined' ? currentRole : null; } catch (e) { return null; } }
  function overrides() {
    var out = {};
    if (!dbRef()) { try { Object.assign(out, JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}')); } catch (e) {} }
    var sh = sharedDocs();
    Object.keys(sh).forEach(function (k) {
      var v = sh[k];
      if (v && v.kind === 'battery_info' && v.no != null) out[v.no] = v.info || {};
    });
    return out;
  }
  // Data awal (Excel) digabung dengan hasil edit; baris yang diedit diberi tanda __edited
  function data() {
    var ov = overrides();
    return baseData().map(function (r) {
      var o = ov[r.no];
      if (!o || !Object.keys(o).length) return r;
      var m = Object.assign({}, r, o); m.__edited = true; return m;
    });
  }
  function fmtDate(iso) {
    if (!iso) return '-';
    var p = iso.split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
  }
  function badge(k) {
    var cls = k === 'Normal' ? 'ok' : k === 'Drop' ? 'warn' : k === 'Rusak' ? 'bad' : 'na';
    return '<span class="bat-kondisi bat-' + cls + '">' + esc(k || '-') + '</span>';
  }
  function fillMerk() {
    var sel = $('batteryFilterMerk');
    if (!sel || sel.options.length > 1) return;
    var merks = Array.from(new Set(data().map(function (r) { return r.merk; }).filter(Boolean))).sort();
    sel.innerHTML = '<option value="ALL">Semua Merk</option>' +
      merks.map(function (m) { return '<option value="' + esc(m) + '">' + esc(m) + '</option>'; }).join('');
  }
  function filtered() {
    var q = ($('batterySearch').value || '').trim().toLowerCase();
    var merk = $('batteryFilterMerk').value;
    var kond = $('batteryFilterKondisi').value;
    return data().filter(function (r) {
      if (merk !== 'ALL' && r.merk !== merk) return false;
      if (kond !== 'ALL' && r.kondisi !== kond) return false;
      if (!q) return true;
      return (r.kode + ' ' + r.merk + ' ' + r.type + ' ' + r.spek + ' ' + r.serial + ' ' + r.ket).toLowerCase().indexOf(q) !== -1;
    });
  }
  function summary(rows) {
    var c = { Normal: 0, Drop: 0, Rusak: 0 };
    rows.forEach(function (r) { if (c[r.kondisi] != null) c[r.kondisi]++; });
    $('batterySummary').innerHTML =
      '<span class="bat-sum bat-ok">Normal <b>' + c.Normal + '</b></span>' +
      '<span class="bat-sum bat-warn">Drop <b>' + c.Drop + '</b></span>' +
      '<span class="bat-sum bat-bad">Rusak <b>' + c.Rusak + '</b></span>';
  }
  function render() {
    if (!$('batteryTable')) return;
    fillMerk();
    var rows = filtered();
    $('batteryCount').textContent = rows.length.toLocaleString('id-ID') + ' baterai';
    summary(rows);
    var pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    page = Math.min(Math.max(1, page), pages);
    var start = (page - 1) * PAGE_SIZE;
    var shown = rows.slice(start, start + PAGE_SIZE);
    if (!rows.length) {
      $('batteryTable').innerHTML = '<div class="ud-group"><div class="workflow-empty" style="margin:18px">Tidak ada baterai yang sesuai dengan filter.</div></div>';
      return;
    }
    var body = shown.map(function (r) {
      return '<tr><td class="ud-no">' + r.no + '</td><td class="ud-unit">' + esc(r.kode) + (r.__edited ? ' <i class="fa-solid fa-pen bat-edited" title="Sudah diedit"></i>' : '') + '</td><td>' + esc(r.merk || '-') +
        '</td><td>' + esc(r.type || '-') + '</td><td>' + esc(r.spek || '-') + '</td><td>' + fmtDate(r.tgl) +
        '</td><td>' + esc(r.serial || '-') + '</td><td>' + esc(r.ket || '-') + '</td><td>' + esc(r.dimensi || '-') +
        '</td><td>' + esc(r.berat || '-') + '</td><td>' + badge(r.kondisi) + '</td>' +
        '<td class="ud-act"><button type="button" class="ud-edit-btn" data-bat-edit="' + r.no + '" title="Edit baterai ' + esc(r.kode) + '" aria-label="Edit baterai ' + esc(r.kode) + '"><i class="fa-solid fa-pen"></i></button></td></tr>';
    }).join('');
    // Pager ringkas: halaman pertama, sekitar halaman aktif, dan terakhir
    var nums = '';
    for (var n = 1; n <= pages; n++) {
      if (n === 1 || n === pages || Math.abs(n - page) <= 1) {
        nums += '<button type="button" class="ud-page' + (n === page ? ' on' : '') + '" data-bat-page="' + n + '">' + n + '</button>';
      } else if (Math.abs(n - page) === 2) {
        nums += '<span>…</span>';
      }
    }
    $('batteryTable').innerHTML =
      '<section class="ud-group"><div class="ud-table-wrap"><table class="ud-table bat-table"><thead><tr>' +
      '<th>No</th><th>Kode</th><th>Merk</th><th>Type</th><th>Spesifikasi</th><th>Tanggal</th><th>Serial</th><th>Keterangan</th><th>Dimensi</th><th>Berat</th><th>Kondisi</th><th>Aksi</th>' +
      '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<div class="ud-pager"><span>Menampilkan ' + (start + 1) + '–' + (start + shown.length) + ' dari ' + rows.length.toLocaleString('id-ID') + '</span>' +
      '<div class="ud-pager-btns"><button type="button" class="ud-page" data-bat-page="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + '>‹</button>' + nums +
      '<button type="button" class="ud-page" data-bat-page="' + (page + 1) + '"' + (page === pages ? ' disabled' : '') + '>›</button></div></div></section>';
  }
  /* ===== Edit data baterai ===== */
  var editingNo = null;
  var LABELS = { kode: 'Kode Baterai', merk: 'Merk', type: 'Type', spek: 'Spesifikasi', tgl: 'Tanggal', serial: 'Serial',
    ket: 'Keterangan', dimensi: 'Dimensi', berat: 'Berat', kondisi: 'Kondisi' };

  function buildModal() {
    if ($('batteryEditModal')) return;
    var f = function (k, extra) {
      return '<div class="ud-edit-field"><label for="be_' + k + '">' + LABELS[k] + '</label>' + extra + '</div>';
    };
    var inp = function (k, attrs) { return '<input id="be_' + k + '" ' + (attrs || '') + '>'; };
    var div = document.createElement('div');
    div.id = 'batteryEditModal'; div.className = 'ov'; div.hidden = true;
    div.innerHTML = '<form class="bx ud-edit-box bat-edit-box" id="batteryEditForm" autocomplete="off">' +
      '<h3 class="ud-edit-title"><i class="fa-solid fa-pen"></i> Edit Data Baterai</h3>' +
      '<div class="bat-edit-grid">' +
      f('kode', inp('kode', 'required maxlength="30"')) +
      f('merk', inp('merk', 'list="be_merkList" maxlength="40"') + '<datalist id="be_merkList"></datalist>') +
      f('type', inp('type', 'maxlength="40"')) +
      f('spek', inp('spek', 'maxlength="40"')) +
      f('tgl', inp('tgl', 'type="date"')) +
      f('serial', inp('serial', 'maxlength="60"')) +
      f('dimensi', inp('dimensi', 'maxlength="40"')) +
      f('berat', inp('berat', 'maxlength="20"')) +
      f('kondisi', '<select id="be_kondisi"><option>Normal</option><option>Drop</option><option>Rusak</option></select>') +
      '<div class="ud-edit-field bat-full"><label for="be_ket">' + LABELS.ket + '</label><input id="be_ket" maxlength="120"></div>' +
      '</div>' +
      '<div class="ud-edit-msg" id="batteryEditMsg" role="status" aria-live="polite"></div>' +
      '<div class="ud-edit-actions"><button type="button" class="ud-edit-restore" id="batteryEditRestore" title="Hapus perubahan dan pakai data awal"><i class="fa-solid fa-rotate-left"></i> Data awal</button>' +
      '<span class="ud-edit-spacer"></span><button type="button" id="batteryEditCancel">Batal</button>' +
      '<button type="submit" id="batteryEditSave" class="ud-edit-save"><i class="fa-solid fa-floppy-disk"></i> Simpan</button></div></form>';
    document.body.appendChild(div);
    $('batteryEditForm').addEventListener('submit', onSubmit);
    $('batteryEditCancel').addEventListener('click', closeEdit);
    $('batteryEditRestore').addEventListener('click', onRestore);
    div.addEventListener('click', function (e) { if (e.target === div) closeEdit(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !div.hidden) closeEdit(); });
  }
  function setMsg(t, err) { var m = $('batteryEditMsg'); m.textContent = t || ''; m.className = 'ud-edit-msg' + (err ? ' err' : ''); }
  function errText(err) {
    try { if (typeof firestoreErrorText === 'function') return firestoreErrorText(err); } catch (e) {}
    return (err && err.message) || String(err);
  }
  function openEdit(no) {
    if (['admin', 'technician'].indexOf(role()) === -1) { alert('Hanya admin atau teknisi yang dapat mengubah data baterai.'); return; }
    var r = data().filter(function (x) { return x.no === no; })[0];
    if (!r) return;
    buildModal();
    editingNo = no;
    FIELDS.forEach(function (k) { $('be_' + k).value = r[k] || ''; });
    $('be_merkList').innerHTML = Array.from(new Set(baseData().map(function (x) { return x.merk; }).filter(Boolean))).sort()
      .map(function (m) { return '<option value="' + esc(m) + '"></option>'; }).join('');
    setMsg(''); $('batteryEditSave').disabled = false;
    $('batteryEditModal').hidden = false; $('be_kode').focus();
  }
  function closeEdit() { if ($('batteryEditModal')) $('batteryEditModal').hidden = true; editingNo = null; }

  // Simpan hanya kolom yang berbeda dari data awal; info kosong = kembali ke data awal
  async function saveInfo(no, info, reason) {
    var id = docId(no), at = new Date().toISOString(), d = dbRef(), sh = sharedDocs();
    var before = sh[id] ? Object.assign({}, sh[id]) : null;
    var prev = data().filter(function (x) { return x.no === no; })[0];
    if (d) {
      sh[id] = { no: no, info: info, kind: 'battery_info', at: at };
      try { await d.collection('laju').doc(id).set({ no: no, info: info, kind: 'battery_info', at: at }); }
      catch (err) { if (before) sh[id] = before; else delete sh[id]; throw err; }
      try {
        if (typeof writeWorkflowAudit === 'function')
          await writeWorkflowAudit('battery_info_updated', 'laju', id, { batteryNo: no, reason: reason, before: prev, after: info });
      } catch (e) { console.error('Audit edit baterai gagal:', e); }
    } else {
      var store = {}; try { store = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); } catch (e) {}
      if (Object.keys(info).length) store[no] = info; else delete store[no];
      localStorage.setItem(LOCAL_KEY, JSON.stringify(store));
    }
    render();
  }
  async function onSubmit(e) {
    e.preventDefault();
    if (editingNo == null) return;
    var base = baseData().filter(function (x) { return x.no === editingNo; })[0], info = {};
    var kode = $('be_kode').value.trim();
    if (!kode) { setMsg('Kode baterai wajib diisi.', true); return; }
    FIELDS.forEach(function (k) {
      var v = $('be_' + k).value.trim();
      if (v !== (base[k] || '')) info[k] = v;
    });
    var btn = $('batteryEditSave'); btn.disabled = true; setMsg('Menyimpan…');
    try { await saveInfo(editingNo, info, 'edit'); closeEdit(); }
    catch (err) { console.error('Simpan data baterai:', err); setMsg('Gagal menyimpan: ' + errText(err), true); btn.disabled = false; }
  }
  async function onRestore() {
    if (editingNo == null || !confirm('Kembalikan data baterai ini ke data awal?')) return;
    try { await saveInfo(editingNo, {}, 'restore'); closeEdit(); }
    catch (err) { setMsg('Gagal mengembalikan: ' + errText(err), true); }
  }

  function init() {
    if (inited || !$('batterySearch')) return;
    inited = true;
    var t;
    $('batterySearch').addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () { page = 1; render(); }, 150);
    });
    ['batteryFilterMerk', 'batteryFilterKondisi'].forEach(function (id) {
      $(id).addEventListener('change', function () { page = 1; render(); });
    });
    $('batteryReset').addEventListener('click', function () {
      $('batterySearch').value = '';
      $('batteryFilterMerk').value = 'ALL';
      $('batteryFilterKondisi').value = 'ALL';
      page = 1; render(); $('batterySearch').focus();
    });
    $('batteryTable').addEventListener('click', function (e) {
      var ed = e.target.closest('[data-bat-edit]');
      if (ed) { openEdit(+ed.dataset.batEdit); return; }
      var b = e.target.closest('[data-bat-page]');
      if (!b || b.disabled) return;
      page = +b.dataset.batPage; render();
    });
  }

  window.mbkRenderBatteries = function () { init(); render(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
