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
      #menuKategoriUnit {margin:0; padding:0; border:0; background:transparent; box-shadow:none; min-width:0}
      #menuKategoriUnit .kategori-title{color:#c7c0b0;font-weight:700;letter-spacing:.35px;font-size:11px;margin-bottom:7px}
      #menuKategoriUnit .kategori-buttons{display:flex;flex-wrap:wrap;gap:6px}
      #menuKategoriUnit .kategori-buttons button{padding:8px 11px;border:1px solid #51452e;border-radius:8px;background:#211e18;color:#e3d9c3;font-weight:650;font-size:12px;cursor:pointer;min-height:36px;white-space:nowrap}
      #menuKategoriUnit .kategori-buttons button:hover{border-color:#d6ac50;background:#302819}
      #menuKategoriUnit .kategori-buttons button.active{background:#d7a73e;border-color:#e9c56d;color:#16120a;box-shadow:none}
      #menuKategoriUnit .kategori-caption{color:#a9a49a;font-size:11px;margin-top:6px;line-height:1.35}
      @media(max-width:540px){#menuKategoriUnit .kategori-buttons button{flex:1 1 auto;padding:8px 9px;font-size:11px}}
    `;
    document.head.appendChild(style);
    const searchCard = q.closest('.card') || q.parentElement;
    searchCard.parentNode.insertBefore(menu, searchCard);
    const toolbar = document.createElement('div');
    toolbar.id = 'unitToolbar';
    searchCard.parentNode.insertBefore(toolbar, menu);
    toolbar.appendChild(menu);
    toolbar.appendChild(searchCard);
    searchCard.classList.add('unit-search-card');
    const searchLabel = document.createElement('label');
    searchLabel.className = 'unit-search-label';
    searchLabel.htmlFor = 'q';
    searchLabel.textContent = 'CARI UNIT';
    searchCard.insertBefore(searchLabel, q);
    const buttons = menu.querySelector('.kategori-buttons');
    const caption = menu.querySelector('.kategori-caption');
    let selected = null;
    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.category = cat.id;
      btn.textContent = `${cat.name === 'FORKLIFT DIESEL' ? 'Diesel' : 'Baterai'} · ${items(cat.id).length}`;
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
