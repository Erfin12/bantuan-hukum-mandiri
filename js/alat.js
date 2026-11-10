/* ===== Alat BHM (bagian 1): grid alat, kamus, LBH, bahasa, kamuflase, panic wipe ===== */
(function () {
  'use strict';

  const { buat, toast, simpan, baca } = window.BHM || {};
  const DAFTAR_ALAT = []; // diisi alat.js dan alat2.js lewat daftar()

  function daftar(alat) { DAFTAR_ALAT.push(alat); }

  const KELAS_INPUT = 'w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30';
  const KELAS_TOMBOL = 'rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-400 active:scale-[0.98]';
  const KELAS_TOMBOL2 = 'rounded-xl border border-indigo-500 bg-indigo-500/15 px-4 py-2.5 text-sm font-bold text-indigo-200 transition hover:bg-indigo-500/25';

  function kartuAlat(judul, deskripsi) {
    const k = buat('div', 'rounded-2xl border border-slate-700/60 bg-slate-800/50 p-5');
    k.appendChild(buat('h3', 'text-base font-bold text-white', judul));
    if (deskripsi) k.appendChild(buat('p', 'mt-1 text-sm leading-relaxed text-slate-400', deskripsi));
    return k;
  }

  function tampilkanGrid() {
    const grid = document.getElementById('alatGrid');
    const detail = document.getElementById('alatDetail');
    detail.classList.add('hidden');
    detail.innerHTML = '';
    grid.classList.remove('hidden');
    grid.innerHTML = '';
    for (const alat of DAFTAR_ALAT) {
      const kartu = buat('button', 'kartu-fitur rounded-2xl border border-slate-700/60 bg-slate-800/50 p-4 text-left transition hover:border-indigo-500/50');
      kartu.type = 'button';
      kartu.appendChild(buat('span', 'text-xl', alat.ikon));
      kartu.appendChild(buat('p', 'mt-2 text-sm font-bold text-white', alat.judul));
      kartu.appendChild(buat('p', 'mt-0.5 text-[11px] leading-snug text-slate-400', alat.ringkas));
      kartu.addEventListener('click', () => bukaAlat(alat));
      grid.appendChild(kartu);
    }
  }

  function bukaAlat(alat) {
    const grid = document.getElementById('alatGrid');
    const detail = document.getElementById('alatDetail');
    grid.classList.add('hidden');
    detail.classList.remove('hidden');
    detail.innerHTML = '';
    const kembali = buat('button', 'mb-3 rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-slate-400', '← Semua alat');
    kembali.type = 'button';
    kembali.addEventListener('click', tampilkanGrid);
    detail.appendChild(kembali);
    detail.appendChild(alat.render());
    window.scrollTo({ top: 0 });
  }

  function muatJSON(url) {
    return fetch(url).then((r) => {
      if (!r.ok) throw new Error('Gagal memuat ' + url);
      return r.json();
    });
  }

  // ---------- Fase 16: Kamus hukum awam ----------
  daftar({
    id: 'kamus', ikon: '📖', judul: 'Kamus Hukum Awam',
    ringkas: '50 istilah hukum diterjemahkan ke bahasa sehari-hari',
    render() {
      const k = kartuAlat('📖 Kamus Hukum Awam', 'Cari istilah hukum yang membingungkan; artinya ditulis dengan bahasa sehari-hari.');
      const input = buat('input', KELAS_INPUT + ' mt-3');
      input.placeholder = 'Ketik istilah, misal: somasi, visum, delik aduan...';
      const daftarUl = buat('ul', 'mt-3 space-y-2');
      k.appendChild(input);
      k.appendChild(daftarUl);

      function gambar(data, saring) {
        daftarUl.innerHTML = '';
        const cocok = data.filter((d) =>
          !saring || d.istilah.toLowerCase().includes(saring) || d.arti.toLowerCase().includes(saring));
        if (cocok.length === 0) {
          daftarUl.appendChild(buat('li', 'text-sm text-slate-400', 'Tidak ada istilah yang cocok.'));
          return;
        }
        for (const d of cocok) {
          const item = buat('li', 'rounded-xl border border-slate-700 bg-slate-900/60 p-3');
          item.appendChild(buat('p', 'text-sm font-bold text-indigo-300', d.istilah));
          item.appendChild(buat('p', 'mt-0.5 text-sm leading-relaxed text-slate-300', d.arti));
          daftarUl.appendChild(item);
        }
      }

      muatJSON('data/kamus.json').then((data) => {
        gambar(data, '');
        input.addEventListener('input', () => gambar(data, input.value.trim().toLowerCase()));
      }).catch((e) => toast(e.message));
      return k;
    }
  });

  // ---------- Fase 17: Direktori LBH ----------
  daftar({
    id: 'lbh', ikon: '🏛️', judul: 'Direktori LBH',
    ringkas: 'Kontak LBH/YLBHI di 18 kota + layanan darurat nasional, offline',
    render() {
      const k = kartuAlat('🏛️ Direktori Bantuan Hukum', 'Bantuan hukum gratis untuk yang tidak mampu. Data tersimpan offline di aplikasi.');
      const darurat = buat('div', 'mt-3 grid grid-cols-1 gap-2');
      k.appendChild(darurat);
      const daftarDiv = buat('div', 'mt-3 space-y-2');
      k.appendChild(daftarDiv);
      k.appendChild(buat('p', 'mt-3 text-[11px] text-slate-500', 'Sumber: direktori YLBHI (ylbhi.or.id), diperiksa 10 November 2026. Nomor bisa berubah; cek situs resmi bila sempat.'));

      muatJSON('data/lbh.json').then((data) => {
        for (const n of data.nasional) {
          const a = buat('a', 'flex items-center justify-between rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-sm font-bold text-rose-200');
          a.appendChild(buat('span', '', n.nama));
          a.appendChild(buat('span', '', n.jenis === 'whatsapp' ? '💬 ' + n.kontak : '📞 ' + n.kontak));
          a.href = n.jenis === 'whatsapp' ? 'https://wa.me/62' + n.kontak.slice(1) : 'tel:' + n.kontak;
          if (n.jenis === 'whatsapp') { a.target = '_blank'; a.rel = 'noopener'; }
          darurat.appendChild(a);
        }
        for (const o of data.kantor) {
          const item = buat('div', 'rounded-xl border border-slate-700 bg-slate-900/60 p-3');
          item.appendChild(buat('p', 'text-sm font-bold text-white', o.nama + ' — ' + o.kota));
          const baris = buat('div', 'mt-1.5 flex flex-wrap gap-2');
          for (const t of o.telepon) {
            const a = buat('a', 'rounded-lg border border-slate-600 px-2 py-1 text-xs font-semibold text-indigo-300', '📞 ' + t);
            a.href = 'tel:' + t.replace(/[^0-9]/g, '');
            baris.appendChild(a);
          }
          item.appendChild(baris);
          daftarDiv.appendChild(item);
        }
      }).catch((e) => toast(e.message));
      return k;
    }
  });

  // ---------- Fase 24: Bahasa daerah ----------
  daftar({
    id: 'bahasa', ikon: '🗣️', judul: 'Bahasa Daerah',
    ringkas: 'Ringkasan hukum dalam bahasa santai, Jawa, dan Sunda',
    render() {
      const k = kartuAlat('🗣️ Bahasa Sehari-hari', 'Pilih bahasa, lalu baca ringkasan tiap pasal dengan bahasa yang akrab. Label menu utama ikut berganti.');
      const pilih = buat('select', KELAS_INPUT + ' mt-3');
      k.appendChild(pilih);
      const isi = buat('div', 'mt-3 space-y-2');
      k.appendChild(isi);

      Promise.all([muatJSON('data/bahasa.json'), window.BHMMesin.muatDatabase()]).then(([bahasa, db]) => {
        for (const b of bahasa.bahasa) {
          const opsi = buat('option', '', b.label);
          opsi.value = b.id;
          pilih.appendChild(opsi);
        }
        const tersimpan = baca('bhm_bahasa', 'baku');
        pilih.value = tersimpan;

        function terapkan(id) {
          simpan('bhm_bahasa', id);
          // Ganti label UI utama.
          document.querySelectorAll('[data-i18n]').forEach((n) => {
            const kunci = n.dataset.i18n;
            if (bahasa.ui[kunci] && bahasa.ui[kunci][id]) n.textContent = bahasa.ui[kunci][id];
          });
          document.querySelectorAll('[data-i18n-ph]').forEach((n) => {
            const kunci = n.dataset.i18nPh;
            if (bahasa.ui[kunci] && bahasa.ui[kunci][id]) n.placeholder = bahasa.ui[kunci][id];
          });
          // Ringkasan per pasal.
          isi.innerHTML = '';
          for (const p of db) {
            const item = buat('div', 'rounded-xl border border-slate-700 bg-slate-900/60 p-3');
            item.appendChild(buat('p', 'text-sm font-bold text-indigo-300', p.kategori));
            item.appendChild(buat('p', 'mt-0.5 text-sm leading-relaxed text-slate-300', p.ringkasan[id] || p.ringkasan.santai));
            isi.appendChild(item);
          }
        }
        pilih.addEventListener('change', () => terapkan(pilih.value));
        terapkan(tersimpan);
      }).catch((e) => toast(e.message));
      return k;
    }
  });

  // ---------- Fase 22: Mode kamuflase ----------
  daftar({
    id: 'kamuflase', ikon: '🕶️', judul: 'Mode Kamuflase',
    ringkas: 'Ubah tampilan jadi kalkulator biasa; kembali dengan 3x ketuk layar hasil',
    render() {
      const k = kartuAlat('🕶️ Mode Kamuflase', 'Satu ketukan mengubah aplikasi menjadi kalkulator polos yang benar-benar berfungsi — orang lain tidak sadar ini aplikasi hukum. Untuk kembali: ketuk angka hasil 3 kali cepat.');
      const tombol = buat('button', KELAS_TOMBOL + ' mt-3 w-full', 'Aktifkan Kamuflase Sekarang');
      tombol.type = 'button';
      tombol.addEventListener('click', () => window.BHM.aktifkanKamuflase());
      k.appendChild(tombol);
      return k;
    }
  });

  // Kalkulator fungsional untuk tampilan kamuflase.
  function initKalkulator() {
    const grid = document.getElementById('kalGrid');
    const display = document.getElementById('kalDisplay');
    let ekspresi = '';
    const tombol2 = ['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '⌫', '='];
    for (const t of tombol2) {
      const b = buat('button', 'rounded-2xl bg-slate-800 py-4 text-xl font-semibold text-slate-200 transition active:bg-slate-700', t);
      b.type = 'button';
      b.addEventListener('click', () => {
        if (t === 'C') ekspresi = '';
        else if (t === '⌫') ekspresi = ekspresi.slice(0, -1);
        else if (t === '=') {
          try {
            const aman = ekspresi.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
            if (!/^[0-9+\-*/().\s]*$/.test(aman)) throw new Error('tidak valid');
            const hasil = Function('"use strict"; return (' + aman + ')')();
            ekspresi = String(Math.round(hasil * 1e10) / 1e10);
          } catch (e) { ekspresi = ''; display.textContent = 'Error'; return; }
        } else ekspresi += t;
        display.textContent = ekspresi || '0';
      });
      grid.appendChild(b);
    }
  }

  // ---------- Fase 20: Panic wipe ----------
  daftar({
    id: 'panic', ikon: '🧨', judul: 'Panic Wipe',
    ringkas: 'Hapus seluruh data aplikasi di HP ini dalam satu detik',
    render() {
      const k = kartuAlat('🧨 Panic Wipe', 'Menghapus SEMUA data aplikasi di perangkat ini: cerita, hash bukti, tracker, pengingat, pengaturan. Tidak bisa dibatalkan. Ketuk dua kali untuk benar-benar menghapus.');
      const tombol = buat('button', 'mt-3 w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-500', '🧨 Hapus Semua Data Sekarang');
      tombol.type = 'button';
      let konfirmasi = null;
      tombol.addEventListener('click', async () => {
        if (!konfirmasi) {
          tombol.textContent = '⚠️ YAKIN? Semua data hilang. Ketuk sekali lagi.';
          konfirmasi = setTimeout(() => { tombol.textContent = '🧨 Hapus Semua Data Sekarang'; konfirmasi = null; }, 4000);
          return;
        }
        clearTimeout(konfirmasi);
        localStorage.clear();
        try {
          const dbs = await (indexedDB.databases ? indexedDB.databases() : Promise.resolve([]));
          for (const d of dbs) if (d.name) indexedDB.deleteDatabase(d.name);
        } catch (e) {}
        try {
          const nama2 = await caches.keys();
          for (const n of nama2) await caches.delete(n);
        } catch (e) {}
        toast('Semua data dihapus.');
        setTimeout(() => location.reload(), 600);
      });
      k.appendChild(tombol);
      return k;
    }
  });

  window.BHMAlat = { daftar, kartuAlat, KELAS_INPUT, KELAS_TOMBOL, KELAS_TOMBOL2, muatJSON, tampilkanGrid, init() { tampilkanGrid(); }, DAFTAR_ALAT, buka(id) { const a = DAFTAR_ALAT.find((x) => x.id === id); if (a) bukaAlat(a); return !!a; } };
  window.BHMKamuflase = { initKalkulator };
})();
