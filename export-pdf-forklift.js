/* =====================================================================
   export-pdf-forklift.js
   Unduh laporan Master Plan PM unit terpilih sebagai FILE PDF (A4 landscape).
   - Langsung terunduh sebagai .pdf (tanpa dialog Print, tanpa library luar).
   - Isi PDF hanya data: informasi unit, matriks PM 2027, dan jadwal servis.
   - Data diambil dari yang sedang tampil di halaman (termasuk downtime & laju).
   Pasang di index.html:  <script src="export-pdf-forklift.js"></script>
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- Pengaturan ---------- */
  var CFG = {
    buttonId: 'exportPdfBtnMain',   // id tombol "Unduh Laporan PDF"
    resultId: 'res',                // kontainer hasil (hidden bila belum ada unit dipilih)
    infoId: 'info',                 // kotak informasi detail unit
    matrixId: 'mx',                 // tabel matriks bulanan
    tableId: 'tb',                  // tabel jadwal servis
    includeOutside2027: true,       // false = baris jadwal di luar 2027 tidak ikut dicetak
    title: 'BENGKEL FORKLIFT \u2014 LAPORAN MASTER PLAN PM 2027',
    footer: 'MASTER PLAN PM FORKLIFT 2027 \u00B7 Laporan per unit \u00B7 Format A4 landscape',
    note: 'Tanggal pada laporan memperhitungkan downtime dan laju kerja yang tampil saat laporan dibuat. ' +
          'Laporan adalah salinan kondisi saat dibuat; perubahan berikutnya tidak otomatis mengubah PDF.'
  };

  var PW = 841.89, PH = 595.28, MX = 34, MT = 34, MB = 44, CW = PW - 2 * MX;
  var WR = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584, 761, 556, 556, 222, 556, 333, 1000, 556, 556, 333, 1000, 667, 333, 1000, 556, 611, 556, 556, 222, 222, 333, 333, 350, 556, 1000, 333, 1000, 500, 333, 944, 556, 500, 667, 278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370, 556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 556, 537, 278, 333, 333, 365, 556, 834, 834, 834, 611, 667, 667, 667, 667, 667, 667, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278, 556, 556, 556, 556, 556, 556, 556, 584, 611, 556, 556, 556, 556, 500, 556, 500];
  var WB = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584, 761, 556, 611, 278, 556, 500, 1000, 556, 556, 333, 1000, 667, 333, 1000, 611, 611, 611, 611, 278, 278, 500, 500, 350, 556, 1000, 333, 1000, 556, 333, 944, 611, 500, 667, 278, 333, 556, 556, 556, 556, 280, 556, 333, 737, 370, 556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 611, 556, 278, 333, 333, 365, 556, 834, 834, 834, 611, 722, 722, 722, 722, 722, 722, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 556, 556, 556, 556, 556, 278, 278, 278, 278, 611, 611, 611, 611, 611, 611, 611, 584, 611, 611, 611, 611, 611, 556, 611, 556];
  var FILL = { 100: '#e2efda', 200: '#fff2cc', 400: '#ddebf7', 1200: '#fce4d6', 2400: '#f4b084' };

  /* ---------- Teks -> WinAnsi & ukuran ---------- */
  var MAP = { '\u2013': '\x96', '\u2014': '\x97', '\u2022': '\x95', '\u2018': '\x91', '\u2019': '\x92',
              '\u201C': '\x93', '\u201D': '\x94', '\u2192': '->', '\u2026': '...', '\u2713': '', '\u25CF': '' };
  function enc(s) {
    s = String(s == null ? '' : s).replace(/\s+/g, ' ');
    var o = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i), k = s.charCodeAt(i);
      if (MAP.hasOwnProperty(c)) o += MAP[c];
      else if (k >= 32 && k <= 255) o += c;
      else o += '?';
    }
    return o;
  }
  function tw(s, size, bold) {
    var t = bold ? WB : WR, w = 0;
    for (var i = 0; i < s.length; i++) { var v = t[s.charCodeAt(i) - 32]; w += (v == null ? 556 : v); }
    return w * size / 1000;
  }
  function esc(s) { return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }
  function wrap(s, size, bold, maxW) {
    s = enc(s);
    if (!s) return [''];
    var words = s.split(' '), lines = [], cur = '';
    words.forEach(function (w) {
      while (tw(w, size, bold) > maxW) {            // kata terlalu panjang: potong
        var n = 1; while (n < w.length && tw(w.slice(0, n + 1), size, bold) <= maxW) n++;
        if (cur) { lines.push(cur); cur = ''; }
        lines.push(w.slice(0, n)); w = w.slice(n);
      }
      var t = cur ? cur + ' ' + w : w;
      if (tw(t, size, bold) <= maxW) cur = t; else { if (cur) lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  }
  function rgb(hex) {
    var h = hex.replace('#', '');
    return [0, 2, 4].map(function (i) { return (parseInt(h.substr(i, 2), 16) / 255).toFixed(3); }).join(' ');
  }
  function f2(n) { return (Math.round(n * 100) / 100).toString(); }

  /* ---------- Penulis halaman PDF ---------- */
  function Doc() {
    this.pages = []; this.cur = null; this.newPage();
  }
  Doc.prototype.newPage = function () { this.cur = []; this.pages.push(this.cur); return MT; };
  Doc.prototype.rect = function (x, y, w, h, fill, stroke, lw) {
    var o = [];
    if (fill) o.push(rgb(fill) + ' rg');
    if (stroke) o.push(rgb(stroke) + ' RG ' + f2(lw || 0.5) + ' w');
    o.push(f2(x) + ' ' + f2(PH - y - h) + ' ' + f2(w) + ' ' + f2(h) + ' re ' + (fill && stroke ? 'B' : fill ? 'f' : 'S'));
    this.cur.push(o.join(' '));
  };
  Doc.prototype.line = function (x1, y1, x2, y2, color, lw) {
    this.cur.push(rgb(color) + ' RG ' + f2(lw || 0.5) + ' w ' + f2(x1) + ' ' + f2(PH - y1) + ' m ' + f2(x2) + ' ' + f2(PH - y2) + ' l S');
  };
  Doc.prototype.text = function (s, x, yBase, size, bold, color, align, boxW) {
    s = enc(s); if (!s) return;
    var w = tw(s, size, bold);
    if (align === 'center') x += (boxW - w) / 2; else if (align === 'right') x += boxW - w;
    this.cur.push('BT /' + (bold ? 'F2' : 'F1') + ' ' + f2(size) + ' Tf ' + rgb(color || '#222222') + ' rg ' +
      f2(x) + ' ' + f2(PH - yBase) + ' Td (' + esc(s) + ') Tj ET');
  };

  /* ---------- Tabel (dengan header berulang & pindah halaman) ---------- */
  function drawTable(doc, y, o) {
    var fs = o.fs || 8, pad = o.pad || 3.5, lh = fs * 1.25, x0 = o.x || MX;
    function rowH(cells, bold) {
      var m = 1;
      cells.forEach(function (c, i) { m = Math.max(m, wrap(c.t, fs, bold || c.bold, o.cols[i].w - 2 * pad).length); });
      return m * lh + 2 * pad;
    }
    function drawRow(cells, yy, h, isHead) {
      var x = x0;
      cells.forEach(function (c, i) {
        var col = o.cols[i];
        doc.rect(x, yy, col.w, h, isHead ? '#e8d7ab' : (c.fill || null), '#bbbbbb', 0.5);
        var lines = wrap(c.t, fs, isHead || c.bold, col.w - 2 * pad);
        lines.forEach(function (ln, k) {
          doc.text(ln, x + pad, yy + pad + fs * 0.92 + k * lh, fs, isHead || c.bold, isHead ? '#30230c' : (c.color || '#222222'),
                   col.align === 'left' ? 'left' : 'center', col.w - 2 * pad);
        });
        x += col.w;
      });
    }
    var head = o.head.map(function (t) { return { t: t }; });
    var hh = rowH(head, true);
    if (y + hh + (o.rows.length ? rowH(o.rows[0], false) : 0) > PH - MB) y = doc.newPage();
    drawRow(head, y, hh, true); y += hh;
    o.rows.forEach(function (cells) {
      var h = rowH(cells, false);
      if (y + h > PH - MB) { y = doc.newPage(); drawRow(head, y, hh, true); y += hh; }
      drawRow(cells, y, h, false); y += h;
    });
    return y;
  }

  /* ---------- Ambil data yang tampil di halaman ---------- */
  function $(id) { return document.getElementById(id); }
  function txt(el) { return el ? String(el.textContent).replace(/\s+/g, ' ').trim() : ''; }
  function catOf(td) {
    var el = td.querySelector('[class]') || td, m = /\bt(100|200|400|1200|2400)\b/.exec(el.className || '');
    return m ? m[1] : null;
  }
  function extract() {
    var res = $(CFG.resultId);
    if (!res || res.hidden) throw new Error('Silakan pilih satu unit terlebih dahulu.');
    var info = Array.prototype.map.call($(CFG.infoId).children, function (d) {
      return { k: txt(d.querySelector('b')), v: txt(d.querySelector('span')) };
    }).filter(function (x) { return x.k; });
    var mxT = $(CFG.matrixId), tbT = $(CFG.tableId);
    if (!info.length || !mxT.rows.length || tbT.rows.length < 2) throw new Error('Data unit belum tampil. Pilih unit terlebih dahulu.');
    var matrix = Array.prototype.map.call(mxT.rows, function (r) {
      return Array.prototype.map.call(r.cells, function (c) { return { t: txt(c), cat: catOf(c) }; });
    });
    var head = Array.prototype.map.call(tbT.rows[0].cells, txt);
    var rows = [];
    Array.prototype.slice.call(tbT.rows, 1).forEach(function (r) {
      var out = r.classList.contains('out');
      if (out && !CFG.includeOutside2027) return;
      rows.push(Array.prototype.map.call(r.cells, function (c) {
        var inp = c.querySelector('input');
        return { t: inp ? inp.value : txt(c), cat: catOf(c), gray: out };
      }));
    });
    function get(k) { var f = info.filter(function (x) { return x.k === k; })[0]; return f ? f.v : ''; }
    var code = get('Kode Unit') || 'Unit';
    return { code: code, battery: /baterai/i.test(get('Jenis Machine')) || /baterai/i.test(code), info: info, matrix: matrix, head: head, rows: rows };
  }

  /* ---------- Susun PDF ---------- */
  function buildPdf(m, now) {
    var doc = new Doc(), y = MT;
    now = now || new Date();
    var stamp;
    try { stamp = now.toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }); } catch (e) { stamp = now.toISOString(); }

    // Judul
    doc.text(CFG.title, MX, y + 15, 17, true, '#4d3810');
    doc.text(m.code + '  \u00B7  ' + (m.battery ? 'FORKLIFT BATERAI' : 'FORKLIFT DIESEL') + '  \u00B7  Dibuat: ' + stamp, MX, y + 30, 9, false, '#555555');
    doc.line(MX, y + 37, MX + CW, y + 37, '#b78a27', 2);
    y += 50;

    // Informasi unit (kotak 4 kolom)
    var gap = 7, tileW = (CW - 3 * gap) / 4, th = 36;
    m.info.forEach(function (it, i) {
      var cx = MX + (i % 4) * (tileW + gap), cy = y + Math.floor(i / 4) * (th + gap);
      doc.rect(cx, cy, tileW, th, null, '#d8d8d8', 0.6);
      doc.text(it.k, cx + 6, cy + 12, 7.5, false, '#555555');
      var vl = wrap(it.v, 10, true, tileW - 12);
      doc.text(vl[0] + (vl.length > 1 ? '...' : ''), cx + 6, cy + 27, 10, true, '#222222');
    });
    y += Math.ceil(m.info.length / 4) * (th + gap) + 6;

    // Matriks
    doc.text('MATRIKS PM 2027', MX, y + 10, 11, true, '#6d5019'); y += 16;
    var mcols = [{ w: 120, align: 'left' }, { w: 58 }, { w: 58 }, { w: 58 }, { w: 58 }];
    var mrows = m.matrix.slice(1).map(function (r) {
      return r.map(function (c, i) { return { t: c.t, bold: i === 0 || !!c.cat, fill: c.cat ? FILL[c.cat] : null }; });
    });
    y = drawTable(doc, y, { cols: mcols, head: m.matrix[0].map(function (c) { return c.t; }), rows: mrows, fs: 8.5, pad: 2.6 });
    y += 16;

    // Jadwal servis
    if (y + 70 > PH - MB) y = doc.newPage();
    doc.text('JADWAL SERVIS UNIT', MX, y + 10, 11, true, '#6d5019'); y += 16;
    var n = m.head.length, cols;
    if (n === 8) {
      var fixed = [34, 78, 58, 82, 52, 62, 82];
      cols = fixed.map(function (w) { return { w: w }; });
      cols.push({ w: CW - fixed.reduce(function (a, b) { return a + b; }, 0), align: 'left' });
    } else {
      cols = m.head.map(function () { return { w: CW / n }; });
    }
    var srows = m.rows.map(function (r) {
      return r.map(function (c, i) {
        return { t: c.t, fill: c.cat ? FILL[c.cat] : null, bold: !!c.cat, color: c.gray ? '#888888' : '#222222' };
      });
    });
    y = drawTable(doc, y, { cols: cols, head: m.head, rows: srows, fs: 8, pad: 3.5 });

    // Catatan
    y += 10;
    wrap(CFG.note, 8, false, CW).forEach(function (ln, i) {
      if (y + 12 > PH - MB) y = doc.newPage();
      doc.text(ln, MX, y + 8, 8, false, '#555555'); y += 11;
    });

    // Footer & nomor halaman
    var total = doc.pages.length;
    doc.pages.forEach(function (ops, i) {
      doc.cur = ops;
      doc.line(MX, PH - 30, MX + CW, PH - 30, '#cccccc', 0.6);
      doc.text(CFG.footer, MX, PH - 19, 8, false, '#666666');
      doc.text('Halaman ' + (i + 1) + ' dari ' + total, MX, PH - 19, 8, false, '#666666', 'right', CW);
    });
    return assemble(doc.pages, m.code, now);
  }

  function assemble(pages, code, now) {
    var objs = [], n = pages.length, p2 = function (v) { return ('0' + v).slice(-2); };
    objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objs[2] = '<< /Type /Pages /Kids [' + pages.map(function (_, i) { return (6 + i * 2) + ' 0 R'; }).join(' ') + '] /Count ' + n + ' >>';
    objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
    objs[5] = '<< /Title (' + esc(enc('Laporan PM 2027 - ' + code)) + ') /Producer (Master Plan PM Forklift 2027) /CreationDate (D:' +
      now.getFullYear() + p2(now.getMonth() + 1) + p2(now.getDate()) + p2(now.getHours()) + p2(now.getMinutes()) + p2(now.getSeconds()) + ') >>';
    pages.forEach(function (ops, i) {
      var pid = 6 + i * 2, s = ops.join('\n');
      objs[pid] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + (pid + 1) + ' 0 R >>';
      objs[pid + 1] = '<< /Length ' + s.length + ' >>\nstream\n' + s + '\nendstream';
    });
    var out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', off = [], i;
    for (i = 1; i < objs.length; i++) { off[i] = out.length; out += i + ' 0 obj\n' + objs[i] + '\nendobj\n'; }
    var xr = out.length;
    out += 'xref\n0 ' + objs.length + '\n0000000000 65535 f \n';
    for (i = 1; i < objs.length; i++) out += ('0000000000' + off[i]).slice(-10) + ' 00000 n \n';
    out += 'trailer\n<< /Size ' + objs.length + ' /Root 1 0 R /Info 5 0 R >>\nstartxref\n' + xr + '\n%%EOF';
    var u8 = new Uint8Array(out.length);
    for (i = 0; i < out.length; i++) u8[i] = out.charCodeAt(i) & 255;
    return u8;
  }

  /* ---------- Unduh file ---------- */
  function download(bytes, name) {
    var blob = new Blob([bytes], { type: 'application/pdf' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function fileName(code) {
    return 'Laporan_PM_2027_' + String(code).replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') + '.pdf';
  }
  function onClick() {
    try {
      var m = extract();
      download(buildPdf(m), fileName(m.code));
    } catch (e) { alert(e && e.message ? e.message : 'Gagal membuat PDF.'); }
  }

  function init() {
    var btn = $(CFG.buttonId);
    if (btn) btn.addEventListener('click', onClick);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.ForkliftPdf = { extract: extract, build: buildPdf, fileName: fileName, config: CFG };
})();
