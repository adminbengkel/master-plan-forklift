/* Export laporan PM unit terpilih ke A4 via dialog Print / Save as PDF. */
(function(){
 'use strict';
 function init(){
  const q=document.getElementById('q'),res=document.getElementById('res'),info=document.getElementById('info'),mx=document.getElementById('mx'),tb=document.getElementById('tb');
  if(!q||!res||!info||!mx||!tb)return;
  const bar=document.createElement('div');bar.id='exportPdfBar';bar.style.cssText='margin:10px 0;display:flex;gap:10px;flex-wrap:wrap;align-items:center';
  const btn=document.createElement('button');btn.type='button';btn.textContent='📄 Unduh Laporan PDF (A4)';btn.style.cssText='background:linear-gradient(135deg,#f2cf72,#c69219);color:#17130a;border:1px solid #d5a32e;font-weight:800;padding:12px 16px;border-radius:9px';
  const hint=document.createElement('span');hint.textContent='Pilih unit dahulu, lalu simpan sebagai PDF dari jendela cetak.';hint.style.cssText='font-size:12px;color:#c9c9c9';
  bar.append(btn,hint);res.insertBefore(bar,res.firstChild);
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  btn.addEventListener('click',()=>{
   if(res.hidden){alert('Silakan pilih satu unit terlebih dahulu.');return;}
   const code=q.value.trim();
   if(!code||typeof DATA==='undefined'||!DATA.some(r=>r.c.toLowerCase()===code.toLowerCase()||r.c.toLowerCase()==='forklift '+code.toLowerCase())){alert('Pilih unit valid dari daftar.');return;}
   const unit=DATA.find(r=>r.c.toLowerCase()===code.toLowerCase()||r.c.toLowerCase()==='forklift '+code.toLowerCase());
   const cat=document.querySelector('#menuKategoriUnit button.active');
   if(cat && cat.dataset.category !== (unit.t==='B'?'B':'D')){alert('Pilih kategori unit yang sesuai.');return;}
   const infoRows=[...info.querySelectorAll('div')].map(d=>[d.querySelector('b')?.textContent||'',d.querySelector('span')?.textContent||'']);
   const details=infoRows.map(([k,v])=>`<div class="field"><small>${escape(k)}</small><strong>${escape(v)}</strong></div>`).join('');
   function tableCopy(source){
    const copy=source.cloneNode(true);
    copy.querySelectorAll('input').forEach(input=>{const value=document.createElement('span');value.textContent=input.value;input.replaceWith(value)});
    copy.querySelectorAll('button,script').forEach(x=>x.remove());
    return copy.outerHTML;
   }
   const now=new Date().toLocaleString('id-ID',{dateStyle:'long',timeStyle:'short'});
   const html=`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Laporan PM ${escape(unit.c)} 2027</title>
<style>
@page{size:A4 landscape;margin:12mm 11mm 13mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#222;background:#fff;margin:0;font-size:10px}header{border-bottom:3px solid #b78a27;padding:0 0 9px;margin-bottom:12px}h1{font-size:19px;margin:0;color:#4d3810}h2{font-size:12px;margin:16px 0 6px;color:#6d5019;break-after:avoid}.muted{font-size:10px;color:#555;margin-top:4px}.fields{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.field{border:1px solid #d8d8d8;padding:7px;min-height:43px;break-inside:avoid}.field small{display:block;color:#555;font-size:9px}.field strong{font-size:11px}.tables{width:100%;border-collapse:collapse;table-layout:auto;font-size:8px}.tables th,.tables td{border:1px solid #bbb;padding:4px 3px;text-align:center;overflow-wrap:anywhere}.tables th{background:#e8d7ab;color:#30230c}.tables td.l{text-align:left;white-space:normal;min-width:55px}.tables tr{break-inside:avoid}.tables thead{display:table-header-group}.tables .t100{background:#e2efda}.tables .t200{background:#fff2cc}.tables .t400{background:#ddebf7}.tables .t1200{background:#fce4d6}.tables .t2400{background:#f4b084}.matrix{width:100%;max-width:480px}.matrix th,.matrix td{font-size:9px;padding:4px}.note{margin:8px 0;font-size:9px;color:#555}.actions{margin:10px 0;padding:10px;background:#f5f1e7}.actions button{font-size:14px;padding:10px 18px;cursor:pointer}footer{font-size:9px;color:#666;border-top:1px solid #ccc;margin-top:15px;padding-top:6px}@media print{.actions{display:none}h2{break-after:avoid}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="actions"><b>Pratinjau laporan A4 landscape.</b> Klik tombol berikut, pilih <b>Simpan sebagai PDF / Save as PDF</b>, ukuran kertas <b>A4</b>. <button onclick="window.print()">Cetak / Simpan PDF</button></div>
<header><h1>BENGKEL FORKLIFT — LAPORAN MASTER PLAN PM 2027</h1><div class="muted">${escape(unit.c)} · ${unit.t==='B'?'FORKLIFT BATERAI':'FORKLIFT DIESEL'} · Dibuat: ${escape(now)}</div></header>
<div class="fields">${details}</div><h2>MATRIKS PM 2027</h2><div class="matrix">${tableCopy(mx).replace('<table','<table class="tables"')}</div><h2>JADWAL SERVIS UNIT</h2>${tableCopy(tb).replace('<table','<table class="tables"')}<p class="note">Tanggal revisi memperhitungkan downtime dan laju kerja yang sedang tampil pada website. Laporan adalah salinan kondisi saat dibuat; perubahan berikutnya tidak otomatis mengubah PDF.</p><footer>MASTER PLAN PM FORKLIFT 2027 · Laporan per unit · Format A4 landscape</footer></body></html>`;
   const win=window.open('','_blank');if(!win){alert('Browser memblokir jendela laporan. Izinkan pop-up untuk website ini lalu coba lagi.');return;}
   win.document.open();win.document.write(html);win.document.close();win.focus();
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
