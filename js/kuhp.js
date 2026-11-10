/* ===== Alat KUHP 2023: jelajah & cari 624 pasal UU No. 1 Tahun 2023 (lokal, offline) ===== */
(function () {
  'use strict';

  const { buat, toast } = window.BHM;
  const { KELAS_INPUT, KELAS_TOMBOL, kartuAlat } = window.BHMAlat;

  async function kartuPasal(kp) {
    const M = window.BHMMudah;
    await M.muatAwam();
    const item = buat('div', 'mt-2 rounded-xl border border-slate-700 bg-slate-900/60 p-3');
    const label = 'Pasal ' + kp.n + ' KUHP (UU 1/2023)';
    item.appendChild(buat('p', 'text-sm font-bold text-white', label + ' — Buku ' + (kp.buku === 1 ? 'Kesatu' : 'Kedua') + ', Bab ' + kp.bab));
    item.appendChild(buat('p', 'mt-1 text-sm leading-relaxed text-slate-300', kp.bunyi));
    item.appendChild(M.blokAwam(M.awamKUHP(kp.n)));
    if (kp.cocok && kp.cocok.length) item.appendChild(buat('p', 'mt-1 text-[11px] text-slate-500', 'Cocok lewat kata: ' + kp.cocok.slice(0, 8).join(', ')));
    item.appendChild(M.barisAksi(label + ': ' + kp.bunyi, 'kuhp', kp.n, label));
    return item;
  }

  window.BHMKuhp = { kartuPasal };

  window.BHMAlat.daftar({
    id: 'kuhp', ikon: '⚖️', judul: 'KUHP 2023',
    ringkas: 'Semua 624 pasal UU No. 1 Tahun 2023, teks asli, tersimpan offline',
    render() {
      const k = kartuAlat('⚖️ KUHP 2023 — 624 Pasal',
        'Seluruh 624 pasal Kitab Undang-Undang Hukum Pidana (UU No. 1 Tahun 2023), berlaku 2 Januari 2026. Teks disalin apa adanya dari salinan resmi (peraturan.bpk.go.id, LN 2023 No. 1) dan tersimpan di HP ini, jadi bisa dibaca offline.');
      const stat = buat('p', 'mt-2 text-xs text-slate-400', 'Memuat teks pasal...');
      k.appendChild(stat);
      window.BHMMesin.muatKUHP().then((db) => {
        stat.textContent = 'Tersedia: ' + db.length + ' pasal (Buku Kesatu 1–187, Buku Kedua 188–624).';
      }).catch(() => { stat.textContent = 'Teks KUHP gagal dimuat.'; });

      const barisInput = buat('div', 'mt-3 flex gap-2');
      const input = buat('input', KELAS_INPUT + ' flex-1');
      input.type = 'search';
      input.placeholder = 'cth: pasal 338, pembunuhan, narkoba, penganiayaan...';
      const tombol = buat('button', KELAS_TOMBOL, 'Cari');
      tombol.type = 'button';
      barisInput.appendChild(input);
      barisInput.appendChild(tombol);
      k.appendChild(barisInput);

      const hasil = buat('div', 'mt-2');
      k.appendChild(hasil);

      async function cari() {
        const q = input.value.trim();
        if (q.length < 3) { toast('Ketik minimal 3 huruf atau "pasal 338".'); return; }
        tombol.disabled = true;
        try {
          const daftar = await window.BHMMesin.cariKUHP(q, 10);
          window.BHMMudah.tambahRiwayat('kuhp', q, daftar.length ? 'Pasal ' + daftar[0].n + ' dkk' : 'tidak ketemu');
          hasil.innerHTML = '';
          if (daftar.length === 0) {
            hasil.appendChild(buat('p', 'mt-3 text-sm text-amber-300', 'Tidak ketemu pasal yang cocok. Coba kata lain yang lebih umum, atau tulis nomor pasalnya langsung (mis. "pasal 338").'));
            return;
          }
          for (const kp of daftar) hasil.appendChild(await kartuPasal(kp));
        } catch (e) {
          toast(e.message || 'Pencarian gagal.');
        } finally {
          tombol.disabled = false;
        }
      }
      tombol.addEventListener('click', cari);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') cari(); });

      // Jelajah cepat per bab: lompat ke pasal pertama tiap bab
      const jelajah = buat('div', 'mt-3');
      jelajah.appendChild(buat('p', 'text-xs font-bold uppercase tracking-wide text-slate-400', 'Lompat ke pasal'));
      const barisLompat = buat('div', 'mt-2 flex gap-2');
      const inNo = buat('input', KELAS_INPUT + ' w-28');
      inNo.type = 'number';
      inNo.min = '1'; inNo.max = '624';
      inNo.placeholder = '1–624';
      const bLompat = buat('button', KELAS_TOMBOL, 'Buka');
      bLompat.type = 'button';
      barisLompat.appendChild(inNo);
      barisLompat.appendChild(bLompat);
      jelajah.appendChild(barisLompat);
      bLompat.addEventListener('click', async () => {
        const n = Number(inNo.value);
        if (!n || n < 1 || n > 624) { toast('Nomor pasal harus antara 1 dan 624.'); return; }
        const e = await window.BHMMesin.bacaPasal(n);
        hasil.innerHTML = '';
        if (e) {
          hasil.appendChild(await kartuPasal(e));
          window.BHMMudah.tambahRiwayat('kuhp', 'pasal ' + n, 'Pasal ' + n);
        }
        else toast('Pasal tidak ditemukan.');
      });
      k.appendChild(jelajah);

      k.appendChild(buat('p', 'mt-3 text-[11px] italic leading-relaxed text-slate-500',
        'Sumber: salinan resmi UU No. 1 Tahun 2023 (LN.2023/No.1, TLN No.6842), diunduh dari peraturan.bpk.go.id pada 10 November 2026. Teks pasal tidak diubah, tidak diparafrase, dan tidak diringkas. Ini bahan bacaan, bukan nasihat hukum.'));
      return k;
    }
  });
})();
