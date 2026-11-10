/* ===== BHM core: util bersama + navigasi + namespace window.BHM =====
   Dimuat paling awal agar modul lain bisa memakai helper ini. */
(function () {
  'use strict';

  let toastTimer = null;

  function toast(pesan) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = pesan;
    t.classList.remove('hidden');
    t.classList.remove('animasi-muncul');
    void t.offsetWidth; // mulai ulang animasi tanpa flicker
    t.classList.add('animasi-muncul');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 3200);
  }

  // ---------- v6: Toast "Tersalin!" (#toast-notif): fade-in, tampil 2 detik lalu disembunyikan ----------
  let timerNotif = null;
  let timerSembunyi = null;
  function toastNotif(pesan, durasi) {
    const t = document.getElementById('toast-notif');
    if (!t) return;
    t.textContent = pesan || 'Teks berhasil disalin!';
    clearTimeout(timerNotif);
    clearTimeout(timerSembunyi);
    t.classList.remove('hidden', 'toast-keluar');
    t.classList.remove('toast-masuk');
    void t.offsetWidth; // mulai ulang animasi fade-in
    t.classList.add('toast-masuk');
    timerNotif = setTimeout(() => {
      t.classList.remove('toast-masuk');
      t.classList.add('hidden');
    }, durasi || 2000);
  }

  /** Elemen dengan textContent (aman untuk isi dari pengguna). */
  function buat(tag, kelas, teks) {
    const node = document.createElement(tag);
    if (kelas) node.className = kelas;
    if (teks !== undefined) node.textContent = teks;
    return node;
  }

  function simpan(kunci, nilai) { localStorage.setItem(kunci, JSON.stringify(nilai)); }
  function baca(kunci, bawaan) {
    try {
      const m = localStorage.getItem(kunci);
      return m ? JSON.parse(m) : bawaan;
    } catch (e) { return bawaan; }
  }

  function goto(nama) {
    document.querySelectorAll('.view').forEach((v) => v.classList.add('hidden'));
    const tujuan = document.getElementById('view-' + nama);
    if (tujuan) {
      tujuan.classList.remove('hidden');
      // Transisi antar-halaman: pudar masuk sekali, tanpa kedip berulang
      tujuan.classList.remove('animasi-muncul');
      void tujuan.offsetWidth;
      tujuan.classList.add('animasi-muncul');
    }
    document.querySelectorAll('.nav-tab').forEach((tab) => {
      const aktif = tab.dataset.nav === nama;
      tab.classList.toggle('text-indigo-400', aktif);
      tab.classList.toggle('text-slate-500', !aktif);
    });
    // Kembali ke atas secara halus (scroll-behavior global: smooth)
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (nama === 'alat' && window.BHMAlat) window.BHMAlat.tampilkanGrid();
  }

  function formatUkuran(byte) {
    if (byte >= 1048576) return (byte / 1048576).toFixed(1) + ' MB';
    if (byte >= 1024) return (byte / 1024).toFixed(1) + ' KB';
    return byte + ' B';
  }
  function formatWaktu(iso) {
    try { return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }); }
    catch (e) { return iso; }
  }

  // ---------- Riwayat hash brankas (dipakai beberapa modul) ----------
  function renderRiwayatHash() {
    const ul = document.getElementById('daftarHash');
    if (!ul || !window.BHMBrankas) return;
    const daftar = window.BHMBrankas.bacaRiwayat();
    ul.innerHTML = '';
    document.getElementById('wadahRiwayatHash').classList.toggle('hidden', daftar.length === 0);
    for (const r of daftar) {
      const item = buat('li', 'animasi-muncul rounded-xl border border-slate-700 bg-slate-900/70 p-3');
      const atas = buat('div', 'flex items-start justify-between gap-2');
      const info = buat('div', 'min-w-0');
      info.appendChild(buat('p', 'truncate text-sm font-semibold text-slate-100', r.nama));
      info.appendChild(buat('p', 'text-[11px] text-slate-500', formatUkuran(r.ukuran) + ' • dikunci ' + formatWaktu(r.waktu)));
      atas.appendChild(info);
      const hapus = buat('button', 'shrink-0 rounded-lg border border-slate-600 px-2 py-1 text-[11px] font-semibold text-slate-400 transition hover:border-rose-500/60 hover:text-rose-300', 'Hapus');
      hapus.type = 'button';
      hapus.addEventListener('click', () => {
        window.BHMBrankas.hapusRekaman(r.id);
        renderRiwayatHash();
        toast('Rekaman hash dihapus.');
      });
      atas.appendChild(hapus);
      item.appendChild(atas);
      item.appendChild(buat('p', 'kode-hash mt-2 text-indigo-300', r.hash));
      if (r.ots) item.appendChild(buat('p', 'mt-1 text-[11px] text-emerald-300', '⏱️ Stempel OTS: ' + r.ots));
      ul.appendChild(item);
    }
  }

  // ---------- Mode kamuflase ----------
  let ketukDisplay = 0;
  let timerKetuk = null;
  function aktifkanKamuflase() {
    const kam = document.getElementById('kamuflase');
    kam.classList.remove('hidden');
    kam.classList.add('flex');
  }
  function matikanKamuflase() {
    const kam = document.getElementById('kamuflase');
    kam.classList.add('hidden');
    kam.classList.remove('flex');
    toast('Mode normal aktif kembali.');
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-tab').forEach((tab) =>
      tab.addEventListener('click', () => goto(tab.dataset.nav))
    );
    document.querySelectorAll('[data-goto]').forEach((b) =>
      b.addEventListener('click', () => goto(b.dataset.goto))
    );
    document.getElementById('kalDisplay').addEventListener('click', () => {
      ketukDisplay += 1;
      clearTimeout(timerKetuk);
      timerKetuk = setTimeout(() => { ketukDisplay = 0; }, 1200);
      if (ketukDisplay >= 3) { ketukDisplay = 0; matikanKamuflase(); }
    });
  });

  window.BHM = { toastNotif, toast, buat, simpan, baca, goto, formatUkuran, formatWaktu, renderRiwayatHash, aktifkanKamuflase, matikanKamuflase };
})();
