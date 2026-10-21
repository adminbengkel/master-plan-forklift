/* MASTER PLAN PM FORKLIFT 2027 — Menu kategori unit
   Tidak mengubah DATA, perhitungan PM, Firebase, atau Firestore. */
(function () {
  'use strict';
  function init() {
    if (typeof DATA === 'undefined' || !Array.isArray(DATA)) {
      console.error('Menu kategori: DATA tidak ditemukan. Pasang script ini setelah script utama.');
      return;
    }
    const q = document.getElementById('q');
    const dl = document.getElementById('dl');
    const status = document.getElementById('st');
    const result = document.getElementById('res');
    if (!q || !dl || !status || !result) return;

    const categories = [
      {id:'D', name:'FORKLIFT DIESEL'},
      {id:'B', name:'FORKLIFT BATERAI'}
      // Nantinya tambahkan: {id:'T', name:'TRAKTOR'}, dst.
    ];
    const typeOf = r => r.t === 'B' ? 'B' : (r.t === 'D' || !r.t ? 'D' : r.t);
    const items = type => DATA.filter(r => typeOf(r) === type);
    const menu = document.createElement('section');
    menu.id = 'menuKategoriUnit';
    menu.className = 'card';
    menu.setAttribute('aria-label', 'Pilih jenis unit');
    menu.innerHTML = '<div class="kategori-title">PILIH JENIS UNIT</div><div class="kategori-buttons" role="group" aria-label="Jenis unit"></div><div class="kategori-caption" aria-live="polite"></div>';
    const style = document.createElement('style');
    style.textContent = `
      #menuKategoriUnit {margin:12px 0 14px; padding:16px; border:1px solid #a67b27; background:rgba(18,18,18,.95);border-radius:14px}
      #menuKategoriUnit .kategori-title{color:#f0c45a;font-weight:800;letter-spacing:1.2px;font-size:13px;margin-bottom:12px}
      #menuKategoriUnit .kategori-buttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #menuKategoriUnit .kategori-buttons button{padding:15px 12px;border:1px solid #8b6a20;border-radius:10px;background:#252119;color:#f3e2b8;font-weight:800;font-size:14px;cursor:pointer}
      #menuKategoriUnit .kategori-buttons button.active{background:linear-gradient(135deg,#f2cf72,#c69219);border-color:#f3d780;color:#1b160b;box-shadow:0 0 0 2px rgba(224,173,53,.15)}
      #menuKategoriUnit .kategori-caption{color:#c9c9c9;font-size:12px;margin-top:11px}
      @media(max-width:540px){#menuKategoriUnit .kategori-buttons{grid-template-columns:1fr}#menuKategoriUnit .kategori-buttons button{padding:13px}}
    `;
    document.head.appendChild(style);
    const searchCard = q.closest('.card') || q.parentElement;
    searchCard.parentNode.insertBefore(menu, searchCard);
    const buttons = menu.querySelector('.kategori-buttons');
    const caption = menu.querySelector('.kategori-caption');
    let selected = null;
    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.category = cat.id;
      btn.textContent = `${cat.name} (${items(cat.id).length} UNIT)`;
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', () => {
        selected = cat.id;
        buttons.querySelectorAll('button').forEach(b => {
          const active = b.dataset.category === selected;
          b.classList.toggle('active', active);
          b.setAttribute('aria-pressed', String(active));
        });
        q.value = '';
        q.disabled = false;
        q.placeholder = selected === 'B' ? 'Cari unit, contoh: Forklift Baterai 10' : 'Cari unit, contoh: A71 atau Forklift A53';
        dl.innerHTML = '';
        items(selected).forEach(r => {
          const opt = document.createElement('option');
          opt.value = r.c;
          opt.label = r.d || '';
          dl.appendChild(opt);
        });
        result.hidden = true;
        status.textContent = `Silakan pilih unit ${cat.name.toLowerCase()} dari daftar.`;
        caption.textContent = `${items(selected).length} unit tersedia. Data dan jadwal kategori lain tidak ditampilkan.`;
        q.focus();
      });
      buttons.appendChild(btn);
    });
    q.disabled = true;
    q.placeholder = 'Pilih jenis unit terlebih dahulu';
    dl.innerHTML = '';
    result.hidden = true;
    status.textContent = 'Pilih FORKLIFT DIESEL atau FORKLIFT BATERAI terlebih dahulu.';
    caption.textContent = 'Pilih salah satu kategori untuk menampilkan unit.';

    // Listener ini berjalan setelah listener render() dari aplikasi utama.
    // Menolak hasil lintas kategori tanpa mengubah fungsi perhitungan asli.
    q.addEventListener('input', () => {
      if (!selected) { result.hidden = true; return; }
      const val = q.value.trim().toLowerCase();
      if (!val) return;
      const unit = DATA.find(r => r.c.toLowerCase() === val || r.c.toLowerCase() === 'forklift ' + val);
      if (unit && typeOf(unit) !== selected) {
        result.hidden = true;
        status.textContent = 'Unit tersebut berada di kategori lain. Pilih kategori yang sesuai.';
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
