/* ===== Alat Jelajah UU: cari di indeks 1.900+ undang-undang (lokal, offline) ===== */
(function () {
  'use strict';

  const { buat, toast } = window.BHM;
  const { KELAS_INPUT, KELAS_TOMBOL, kartuAlat } = window.BHMAlat;

  function daftarHasil(wadah, daftar) {
    wadah.innerHTML = '';
    if (daftar.length === 0) {
      wadah.appendChild(buat('p', 'mt-3 text-sm text-amber-300', 'Tidak ketemu. Coba kata lain yang lebih umum (mis. "tanah", "kerja", "pajak").'));
      return;
    }
    for (const u of daftar) {
      const baris = buat('a', 'mt-2 block rounded-xl border border-slate-700 bg-slate-900/60 p-3 transition hover:border-indigo-500/50');
      baris.href = window.BHMMesin.urlResmi(u);
      baris.target = '_blank';
      baris.rel = 'noopener';
      baris.appendChild(buat('p', 'text-sm font-bold text-white', u.n));
      baris.appendChild(buat('p', 'mt-0.5 text-xs leading-relaxed text-slate-400', u.u));
      if (u.st) baris.appendChild(buat('p', 'mt-1 text-[11px] font-semibold text-amber-300', '⚠ ' + u.st));
      baris.appendChild(buat('p', 'mt-1 text-[11px] text-indigo-300 underline underline-offset-2', 'Buka di JDIH BPK (butuh internet)'));
      wadah.appendChild(baris);
    }
  }

  window.BHMAlat.daftar({
    id: 'jelajah', ikon: '📚', judul: 'Jelajah UU',
    ringkas: 'Cari di indeks 1.900+ undang-undang Indonesia, lengkap dengan tautan resmi JDIH BPK',
    render() {
      const k = kartuAlat('📚 Jelajah Undang-Undang',
        'Cari undang-undang berdasarkan topik dengan kata sehari-hari. Indeks tersimpan di HP ini, jadi bisa dipakai offline. Tautan keluar (JDIH BPK) butuh internet.');
      const stat = buat('p', 'mt-2 text-xs text-slate-400', 'Memuat indeks...');
      k.appendChild(stat);
      window.BHMMesin.muatIndeksUU().then((idx) => {
        stat.textContent = 'Indeks: ' + idx.total.toLocaleString('id-ID') + ' undang-undang (1945–2026), bersumber dari peraturan.bpk.go.id.';
      }).catch(() => { stat.textContent = 'Indeks gagal dimuat.'; });

      const barisInput = buat('div', 'mt-3 flex gap-2');
      const input = buat('input', KELAS_INPUT + ' flex-1');
      input.type = 'search';
      input.placeholder = 'cth: perkawinan, pajak, tanah, kepolisian...';
      const tombol = buat('button', KELAS_TOMBOL, 'Cari');
      tombol.type = 'button';
      barisInput.appendChild(input);
      barisInput.appendChild(tombol);
      k.appendChild(barisInput);

      const hasil = buat('div', 'mt-2');
      k.appendChild(hasil);

      async function cari() {
        const q = input.value.trim();
        if (q.length < 3) { toast('Ketik minimal 3 huruf.'); return; }
        tombol.disabled = true;
        try {
          const daftar = await window.BHMMesin.cariUU(q, 30);
          daftarHasil(hasil, daftar);
        } catch (e) {
          toast(e.message || 'Pencarian gagal.');
        } finally {
          tombol.disabled = false;
        }
      }
      tombol.addEventListener('click', cari);
      input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') cari(); });

      k.appendChild(buat('p', 'mt-3 text-[11px] leading-relaxed text-slate-500',
        'Catatan jujur: indeks ini daftar judul resmi, bukan isi lengkap tiap UU. Status "dicabut/diubah" diambil dari katalog resmi dan bisa tertinggal dari perubahan terbaru; selalu cek status akhir di tautan JDIH BPK.'));
      return k;
    }
  });
})();
