/* ===== Fase 26 & 35: Stempel waktu OpenTimestamps + rekam & kunci suara ===== */
(function () {
  'use strict';

  // ---------- Fase 26: OpenTimestamps ----------
  const KALENDER_OTS = 'https://a.pool.opentimestamps.org/digest';

  function init() {
    const input = document.getElementById('inputGambarOts');
    const tombol = document.getElementById('btnOts');
    const nama = document.getElementById('namaFileOts');
    const hasil = document.getElementById('hasilOts');

    input.addEventListener('change', () => {
      const f = input.files && input.files[0];
      nama.textContent = f ? f.name : 'Pilih gambar untuk di-cap';
      tombol.disabled = !f;
    });

    tombol.addEventListener('click', async () => {
      const f = input.files && input.files[0];
      if (!f) return;
      tombol.disabled = true;
      tombol.textContent = 'Memproses...';
      hasil.classList.remove('hidden');
      hasil.innerHTML = '';
      const kartu = window.BHM.buat('div', 'animasi-muncul rounded-xl border border-slate-700 bg-slate-900/70 p-4');
      try {
        const hash = await window.BHMBrankas.hashBerkas(f);
        // Kirim HANYA hash (32 byte) ke kalender publik; gambar tidak keluar.
        const bytes = new Uint8Array(hash.match(/../g).map((h) => parseInt(h, 16)));
        const respons = await fetch(KALENDER_OTS, { method: 'POST', body: bytes });
        if (!respons.ok) throw new Error('Kalender OTS menjawab HTTP ' + respons.status);
        const bukti = await respons.arrayBuffer();
        // Simpan berkas bukti .ots agar bisa diverifikasi nanti di opentimestamps.org.
        const berkasOts = new Blob([bukti], { type: 'application/vnd.opentimestamps.ots' });
        const url = URL.createObjectURL(berkasOts);
        kartu.appendChild(window.BHM.buat('p', 'text-sm font-bold text-emerald-300', '⏱️ Hash diterima kalender OTS'));
        kartu.appendChild(window.BHM.buat('p', 'mt-1 text-xs leading-relaxed text-slate-400',
          'Stempel akan tertanam di blockchain Bitcoin dalam beberapa jam. Unduh berkas bukti .ots dan simpan bersama gambar aslinya; verifikasi nanti di opentimestamps.org.'));
        kartu.appendChild(window.BHM.buat('p', 'kode-hash mt-2 text-indigo-300', hash));
        const unduh = window.BHM.buat('a', 'mt-2 inline-block rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-bold text-white', 'Unduh bukti .ots');
        unduh.href = url;
        unduh.download = (f.name || 'bukti') + '.ots';
        kartu.appendChild(unduh);
        // Tandai di riwayat brankas juga.
        const rekaman = window.BHMBrankas.tambahRekaman({ nama: f.name, ukuran: f.size, hash });
        rekaman.ots = 'terkirim ' + window.BHM.formatWaktu(new Date().toISOString());
        const daftar = window.BHMBrankas.bacaRiwayat();
        const idx = daftar.findIndex((r) => r.id === rekaman.id);
        if (idx >= 0) { daftar[idx] = rekaman; localStorage.setItem('bhm_brankas_bukti_v1', JSON.stringify(daftar)); }
        window.BHM.renderRiwayatHash();
      } catch (e) {
        kartu.appendChild(window.BHM.buat('p', 'text-sm font-bold text-amber-300', 'Stempel online gagal'));
        kartu.appendChild(window.BHM.buat('p', 'mt-1 text-xs leading-relaxed text-slate-400',
          'Butuh internet dan kalender OTS yang bisa diakses (' + (e.message || 'kesalahan jaringan') + '). Cara manual: kunci gambar di Brankas Bukti, salin hash-nya, lalu kirim lewat opentimestamps.org saat ada koneksi.'));
      }
      hasil.appendChild(kartu);
      tombol.disabled = false;
      tombol.textContent = 'Minta Stempel';
    });
  }

  window.BHMOts = { init };
})();
