/* Master Data > Data Baterai
   Logika tampilan terpisah dari index.html. Data dibaca dari window.MBK_BATTERY_DATA (data-baterai.js).
   Dipanggil oleh setActiveView('batteries') lewat window.mbkRenderBatteries().
   Edit & tambah: disimpan di collection 'laju' (dokumen battery_<key>) seperti edit info unit; fallback localStorage bila offline.
   key = nomor baris Excel untuk data awal, 'new_<timestamp>' untuk baterai yang ditambahkan lewat tombol (+). */
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
  var LOCAL_KEY = 'mbk_battery_info_v1';       // hasil edit data awal: {key: {kolom: nilai}}
  var LOCAL_NEW_KEY = 'mbk_battery_new_v1';    // baterai tambahan: {key: {semua kolom}}
  function baseData() { return Array.isArray(window.MBK_BATTERY_DATA) ? window.MBK_BATTERY_DATA : []; }
  function docId(key) { return 'battery_' + key; }
  function dbRef() { try { return typeof db !== 'undefined' ? db : null; } catch (e) { return null; } }
  function sharedDocs() { try { return typeof lshared !== 'undefined' && lshared ? lshared : {}; } catch (e) { return {}; } }
  function role() { try { return typeof currentRole !== 'undefined' ? currentRole : null; } catch (e) { return null; } }
  function readLocal(k) { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } }
  function overrides() {
    var out = {};
    if (!dbRef()) Object.assign(out, readLocal(LOCAL_KEY));
    var sh = sharedDocs();
    Object.keys(sh).forEach(function (k) {
      var v = sh[k];
      if (v && v.kind === 'battery_info' && v.no != null) out[String(v.no)] = v.info || {};
    });
    return out;
  }
  function addedRows() {
    var out = {};
    if (!dbRef()) Object.assign(out, readLocal(LOCAL_NEW_KEY));
    var sh = sharedDocs();
    Object.keys(sh).forEach(function (k) {
      var v = sh[k];
      if (v && v.kind === 'battery_new' && v.key && v.data) out[v.key] = v.data;
    });
    return out;
  }
  // Data awal (Excel) + hasil edit + baterai tambahan. Penanda: __edited (diedit), __added (tambahan)
  function data() {
    var ov = overrides(), base = baseData(), maxNo = 0;
    var rows = base.map(function (r) {
      var key = String(r.no); if (r.no > maxNo) maxNo = r.no;
      var o = ov[key], m = Object.assign({ key: key }, r);
      if (o && Object.keys(o).length) { Object.assign(m, o); m.__edited = true; }
      return m;
    });
    var add = addedRows();
    Object.keys(add).sort(function (x, y) { return (+x.slice(4)) - (+y.slice(4)); }).forEach(function (key) {
      rows.push(Object.assign({ key: key, no: ++maxNo, __added: true }, add[key]));
    });
    return rows;
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
    if (!sel) return;
    var merks = Array.from(new Set(data().map(function (r) { return r.merk; }).filter(Boolean))).sort();
    var sig = merks.join('|');
    if (sel.dataset.sig === sig) return;
    var cur = sel.value;
    sel.dataset.sig = sig;
    sel.innerHTML = '<option value="ALL">Semua Merk</option>' +
      merks.map(function (m) { return '<option value="' + esc(m) + '">' + esc(m) + '</option>'; }).join('');
    sel.value = merks.indexOf(cur) !== -1 ? cur : 'ALL';
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
      return '<tr><td class="ud-no">' + r.no + '</td><td class="ud-unit">' + esc(r.kode) + (r.__added ? ' <span class="bat-new" title="Ditambahkan manual">BARU</span>' : r.__edited ? ' <i class="fa-solid fa-pen bat-edited" title="Sudah diedit"></i>' : '') + '</td><td>' + esc(r.merk || '-') +
        '</td><td>' + esc(r.type || '-') + '</td><td>' + esc(r.spek || '-') + '</td><td>' + fmtDate(r.tgl) +
        '</td><td>' + esc(r.serial || '-') + '</td><td>' + esc(r.ket || '-') + '</td><td>' + esc(r.dimensi || '-') +
        '</td><td>' + esc(r.berat || '-') + '</td><td>' + badge(r.kondisi) + '</td>' +
        '<td class="ud-act"><button type="button" class="ud-edit-btn" data-bat-edit="' + esc(r.key) + '" title="Edit baterai ' + esc(r.kode) + '" aria-label="Edit baterai ' + esc(r.kode) + '"><i class="fa-solid fa-pen"></i></button></td></tr>';
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
  /* ===== Tambah & edit data baterai ===== */
  var editingKey = null;   // null + adding=true => mode tambah
  var adding = false;
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
      '<h3 class="ud-edit-title"><i class="fa-solid fa-pen" id="batteryEditIcon"></i> <span id="batteryEditTitle">Edit Data Baterai</span></h3>' +
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
      '<div class="ud-edit-actions"><button type="button" class="ud-edit-restore" id="batteryEditRestore"></button>' +
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
  function allowed() {
    if (['admin', 'technician'].indexOf(role()) === -1) { alert('Hanya admin atau teknisi yang dapat mengubah data baterai.'); return false; }
    return true;
  }
  function showModal(title, icon, r, restoreHtml) {
    buildModal();
    FIELDS.forEach(function (k) { $('be_' + k).value = r[k] || ''; });
    $('be_kondisi').value = r.kondisi || 'Normal';
    $('be_merkList').innerHTML = Array.from(new Set(data().map(function (x) { return x.merk; }).filter(Boolean))).sort()
      .map(function (m) { return '<option value="' + esc(m) + '"></option>'; }).join('');
    $('batteryEditTitle').textContent = title;
    $('batteryEditIcon').className = 'fa-solid ' + icon;
    var rb = $('batteryEditRestore');
    rb.style.display = restoreHtml ? '' : 'none'; rb.innerHTML = restoreHtml || '';
    setMsg(''); $('batteryEditSave').disabled = false;
    $('batteryEditModal').hidden = false; $('be_kode').focus();
  }
  function openEdit(key) {
    if (!allowed()) return;
    var r = data().filter(function (x) { return x.key === key; })[0];
    if (!r) return;
    adding = false; editingKey = key;
    showModal(r.__added ? 'Edit Baterai Tambahan' : 'Edit Data Baterai', 'fa-pen', r,
      r.__added ? '<i class="fa-solid fa-trash"></i> Hapus' : '<i class="fa-solid fa-rotate-left"></i> Data awal');
  }
  function openAdd() {
    if (!allowed()) return;
    adding = true; editingKey = null;
    showModal('Tambah Data Baterai', 'fa-plus', { kondisi: 'Normal' }, '');
  }
  function closeEdit() { if ($('batteryEditModal')) $('batteryEditModal').hidden = true; editingKey = null; adding = false; }

  async function audit(action, id, details) {
    try { if (typeof writeWorkflowAudit === 'function') await writeWorkflowAudit(action, 'laju', id, details); }
    catch (e) { console.error('Audit baterai gagal:', e); }
  }
  // Edit data awal: simpan hanya kolom yang berbeda; info kosong = kembali ke data awal
  async function saveInfo(key, info, reason) {
    var id = docId(key), at = new Date().toISOString(), d = dbRef(), sh = sharedDocs();
    var before = sh[id] ? Object.assign({}, sh[id]) : null;
    var prev = data().filter(function (x) { return x.key === key; })[0];
    if (d) {
      var doc = { no: +key, info: info, kind: 'battery_info', at: at };
      sh[id] = doc;
      try { await d.collection('laju').doc(id).set(doc); }
      catch (err) { if (before) sh[id] = before; else delete sh[id]; throw err; }
      await audit('battery_info_updated', id, { batteryNo: +key, reason: reason, before: prev, after: info });
    } else {
      var store = readLocal(LOCAL_KEY);
      if (Object.keys(info).length) store[key] = info; else delete store[key];
      localStorage.setItem(LOCAL_KEY, JSON.stringify(store));
    }
    render();
  }
  // Baterai tambahan: simpan (tambah/ubah) seluruh kolom, atau hapus bila fields === null
  async function saveAdded(key, fields, reason) {
    var id = docId(key), at = new Date().toISOString(), d = dbRef(), sh = sharedDocs();
    var before = sh[id] ? Object.assign({}, sh[id]) : null;
    if (d) {
      try {
        if (fields) { var doc = { key: key, data: fields, kind: 'battery_new', at: at }; sh[id] = doc; await d.collection('laju').doc(id).set(doc); }
        else { delete sh[id]; await d.collection('laju').doc(id).delete(); }
      } catch (err) { if (before) sh[id] = before; else delete sh[id]; throw err; }
      await audit('battery_' + reason, id, { key: key, after: fields, before: before && before.data });
    } else {
      var store = readLocal(LOCAL_NEW_KEY);
      if (fields) store[key] = fields; else delete store[key];
      localStorage.setItem(LOCAL_NEW_KEY, JSON.stringify(store));
    }
    render();
  }
  function formValues() {
    var v = {}; FIELDS.forEach(function (k) { v[k] = $('be_' + k).value.trim(); }); return v;
  }
  async function onSubmit(e) {
    e.preventDefault();
    var v = formValues();
    if (!v.kode) { setMsg('Kode baterai wajib diisi.', true); return; }
    var btn = $('batteryEditSave'); btn.disabled = true; setMsg('Menyimpan…');
    try {
      if (adding) {
        await saveAdded('new_' + Date.now(), v, 'added');
        page = Math.max(1, Math.ceil(data().length / PAGE_SIZE));   // lompat ke halaman terakhir agar data baru terlihat
        render();
      } else {
        var row = data().filter(function (x) { return x.key === editingKey; })[0];
        if (row && row.__added) await saveAdded(editingKey, v, 'updated');
        else {
          var base = baseData().filter(function (x) { return String(x.no) === editingKey; })[0], info = {};
          FIELDS.forEach(function (k) { if (v[k] !== (base[k] || '')) info[k] = v[k]; });
          await saveInfo(editingKey, info, 'edit');
        }
      }
      closeEdit();
    } catch (err) { console.error('Simpan data baterai:', err); setMsg('Gagal menyimpan: ' + errText(err), true); btn.disabled = false; }
  }
  async function onRestore() {
    if (editingKey == null) return;
    var row = data().filter(function (x) { return x.key === editingKey; })[0];
    var isAdded = row && row.__added;
    if (!confirm(isAdded ? 'Hapus baterai ' + row.kode + ' dari daftar?' : 'Kembalikan data baterai ini ke data awal?')) return;
    try {
      if (isAdded) await saveAdded(editingKey, null, 'deleted'); else await saveInfo(editingKey, {}, 'restore');
      closeEdit();
    } catch (err) { setMsg('Gagal: ' + errText(err), true); }
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
    $('batteryAdd').addEventListener('click', openAdd);
    $('batteryReset').addEventListener('click', function () {
      $('batterySearch').value = '';
      $('batteryFilterMerk').value = 'ALL';
      $('batteryFilterKondisi').value = 'ALL';
      page = 1; render(); $('batterySearch').focus();
    });
    $('batteryTable').addEventListener('click', function (e) {
      var ed = e.target.closest('[data-bat-edit]');
      if (ed) { openEdit(ed.dataset.batEdit); return; }
      var b = e.target.closest('[data-bat-page]');
      if (!b || b.disabled) return;
      page = +b.dataset.batPage; render();
    });
  }

  window.mbkRenderBatteries = function () { init(); render(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
