/* Copyright (c) 2026 Erfin. See LICENSE.txt. */
/* ===== BHM: analisis hukum, brankas, surat, audio darurat, init =====
   Memakai helper bersama dari core.js (window.BHM). */
(function () {
  'use strict';

  const { toast, buat, simpan, baca, renderRiwayatHash } = window.BHM;
  const el = (id) => document.getElementById(id);

  document.addEventListener('DOMContentLoaded', () => {

    // ---------- Analisis hukum (Fase 2, 3, 8, 9, 10, 12, 15) ----------
    let peran = 'korban';

    function setPeran(baru) {
      peran = baru;
      const aktif = 'tombol-peran rounded-xl border border-indigo-500 bg-indigo-500/15 px-3 py-2.5 text-sm font-semibold text-indigo-200 transition';
      const mati = 'tombol-peran rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-500';
      el('btnKorban').className = peran === 'korban' ? aktif : mati;
      el('btnKorban').setAttribute('aria-pressed', String(peran === 'korban'));
      el('btnTerlapor').className = peran === 'terlapor' ? aktif : mati;
      el('btnTerlapor').setAttribute('aria-pressed', String(peran === 'terlapor'));
    }
    el('btnKorban').addEventListener('click', () => setPeran('korban'));
    el('btnTerlapor').addEventListener('click', () => setPeran('terlapor'));

    function barisHasil(label, teks, kelasIsi) {
      const wadah = buat('div', 'mt-3');
      wadah.appendChild(buat('p', 'text-[11px] font-semibold uppercase tracking-wide text-indigo-300', label));
      wadah.appendChild(buat('p', kelasIsi || 'mt-1 text-sm leading-relaxed text-slate-200', teks));
      return wadah;
    }

    /** Peta alur visual langkah berikutnya (Fase 12). */
    function buatFlowchart(korban) {
      const langkah = korban
        ? ['Amankan bukti & kunci di Brankas Bukti', 'Kirim somasi ke pihak lawan', 'Lapor ke Polisi (110) atau LBH terdekat']
        : ['Hentikan perbuatannya sekarang', 'Pulihkan kerugian korban & minta maaf tertulis', 'Siapkan pendamping hukum bila dilaporkan'];
      const wadah = buat('div', 'mt-4');
      wadah.appendChild(buat('p', 'text-[11px] font-semibold uppercase tracking-wide text-indigo-300', 'Langkah selanjutnya'));
      langkah.forEach((teks, i) => {
        const kotak = buat('div', 'mt-2 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5');
        kotak.appendChild(buat('span', 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white', String(i + 1)));
        kotak.appendChild(buat('p', 'text-sm text-slate-200', teks));
        wadah.appendChild(kotak);
        if (i < langkah.length - 1) wadah.appendChild(buat('p', 'pl-6 text-indigo-400', '↓'));
      });
      return wadah;
    }

    function kartuPasalRingkas(p, cocokAlt) {
      const k = buat('div', 'mt-3 rounded-xl border border-slate-700 bg-slate-900/60 p-3');
      k.appendChild(buat('p', 'text-xs font-bold text-indigo-300', p.kategori));
      k.appendChild(buat('p', 'mt-0.5 text-sm font-semibold text-white', p.pasal));
      k.appendChild(buat('p', 'mt-0.5 text-xs leading-relaxed text-slate-400', p.ancaman));
      if (cocokAlt && cocokAlt.length) k.appendChild(buat('p', 'mt-1 text-[11px] text-slate-500', 'Kata kunci cocok: ' + cocokAlt.join(', ')));
      return k;
    }

    async function tampilkanHasil(data) {
      const M = window.BHMMudah;
      await M.muatAwam();
      const peranSaatIni = peran;
      const pasal = data.utama ? data.utama.pasal : null;
      const cocok = data.utama ? data.utama.cocok : [];
      const hasil = el('hasilAnalisis');
      hasil.innerHTML = '';
      hasil.classList.remove('hidden');
      const kartu = buat('div', 'animasi-muncul mt-4 rounded-xl border p-4 ' +
        (pasal ? 'border-indigo-500/40 bg-slate-900/70' : 'border-amber-500/40 bg-amber-500/5'));

      if (!pasal) {
        kartu.appendChild(buat('p', 'text-sm font-bold text-amber-300', 'Pasal tidak ditemukan. Konsultasi ke LBH.'));
        kartu.appendChild(buat('p', 'mt-1 text-sm leading-relaxed text-slate-300',
          'Kata kunci di ceritamu belum cocok dengan database. Coba ceritakan lebih rinci, atau langsung konsultasi ke LBH terdekat (menu Alat → Direktori LBH).'));
      } else {
        const sikap = peran === 'korban' ? pasal.logika_triase.sikap_korban : pasal.logika_triase.sikap_pelaku;
        const saran = peran === 'korban' ? pasal.logika_triase.saran_korban : pasal.logika_triase.saran_pelaku;

        const barisAtas = buat('div', 'flex flex-wrap items-center gap-2');
        barisAtas.appendChild(buat('span', 'rounded-lg bg-indigo-500 px-2.5 py-1 text-xs font-bold text-white', pasal.kategori));
        barisAtas.appendChild(buat('span',
          'rounded-lg border px-2.5 py-1 text-xs font-bold ' +
          (sikap === 'MELAWAN' ? 'border-rose-500/50 bg-rose-500/10 text-rose-300' : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'),
          'Sikap: ' + sikap));
        kartu.appendChild(barisAtas);

        kartu.appendChild(barisHasil('Pasal', pasal.pasal, 'mt-1 text-sm font-bold leading-relaxed text-white'));
        kartu.appendChild(barisHasil('Bunyi pasal (teks asli)', pasal.isi));
        kartu.appendChild(M.blokAwam(M.awamPasal(pasal.id)));
        kartu.appendChild(M.barisAksi(pasal.pasal + ': ' + pasal.isi, 'pilihan', pasal.id, pasal.kategori + ' - ' + pasal.pasal));
        kartu.appendChild(barisHasil('Ancaman hukuman', pasal.ancaman));
        kartu.appendChild(barisHasil('Saran untuk kamu', saran));
        kartu.appendChild(buatFlowchart(peran === 'korban'));
        if (pasal.catatan) kartu.appendChild(barisHasil('Catatan', pasal.catatan, 'mt-1 text-xs leading-relaxed text-slate-400'));
        if (cocok.length > 0) kartu.appendChild(barisHasil('Kata kunci yang cocok', cocok.join(', '), 'mt-1 text-xs text-slate-400'));

        // Banding UU lama vs baru (Fase 15)
        if (pasal.kuhp_lama) {
          const detail = buat('details', 'mt-3 rounded-xl border border-slate-700 bg-slate-900/50 p-3');
          detail.appendChild(buat('summary', 'cursor-pointer text-xs font-bold text-indigo-300', '⚖️ Bandingkan dengan KUHP lama'));
          detail.appendChild(barisHasil('Dulu', pasal.kuhp_lama.pasal, 'mt-1 text-xs font-semibold text-slate-300'));
          detail.appendChild(buat('p', 'mt-1 text-xs leading-relaxed text-slate-400', pasal.kuhp_lama.isi));
          detail.appendChild(buat('p', 'mt-2 text-[11px] text-emerald-300', '✔ Aplikasi ini memakai aturan yang berlaku sekarang (KUHP baru, sejak 2 Januari 2026).'));
          kartu.appendChild(detail);
        }

        // Transparansi sumber (Fase 8) + status tinjauan (Fase 9)
        const sumberWadah = buat('div', 'mt-3 flex flex-wrap gap-3');
        const tautanResmi = buat('a', 'text-xs font-semibold text-indigo-300 underline decoration-indigo-500/50 underline-offset-2 hover:text-indigo-200', 'Sumber resmi (JDIH BPK)');
        tautanResmi.href = pasal.sumber_resmi; tautanResmi.target = '_blank'; tautanResmi.rel = 'noopener';
        sumberWadah.appendChild(tautanResmi);
        const tautanTeks = buat('a', 'text-xs font-semibold text-indigo-300 underline decoration-indigo-500/50 underline-offset-2 hover:text-indigo-200', 'Baca teks pasal lengkap');
        tautanTeks.href = pasal.sumber; tautanTeks.target = '_blank'; tautanTeks.rel = 'noopener';
        sumberWadah.appendChild(tautanTeks);
        kartu.appendChild(sumberWadah);
        kartu.appendChild(buat('p', 'mt-2 text-[11px] italic text-slate-500', 'Status tinjauan: ' + pasal.status_tinjauan + ' — aplikasi tidak mengklaim dibuat pengacara.'));

        // Cetak / unduh PDF hasil analisis (v5)
        const tombolCetak = buat('button', 'mt-3 w-full rounded-xl border border-indigo-500 bg-indigo-500/15 px-4 py-2.5 text-sm font-bold text-indigo-200 transition hover:bg-indigo-500/25 active:scale-[0.98]', 'Cetak / Unduh PDF hasil analisis');
        tombolCetak.type = 'button';
        tombolCetak.addEventListener('click', () => {
          try {
            M.buatPDFAnalisis(data, el('inputCerita').value.trim(), peranSaatIni).save('hasil-analisis-bhm.pdf');
            toast('PDF hasil analisis berhasil dibuat dan diunduh.');
          } catch (e) {
            toast(e.message || 'PDF gagal dibuat.');
          }
        });
        kartu.appendChild(tombolCetak);

        // Lapor error (Fase 10)
        const tombolLapor = buat('button', 'mt-3 rounded-lg border border-slate-600 px-3 py-1.5 text-[11px] font-semibold text-slate-400 transition hover:border-amber-500/60 hover:text-amber-300', '🙋 Analisis salah? Laporkan');
        tombolLapor.type = 'button';
        tombolLapor.addEventListener('click', () => {
          const log = baca('bhm_laporan_error', []);
          log.unshift({ waktu: new Date().toISOString(), cerita: el('inputCerita').value.slice(0, 500), pasal_dipilih: pasal.id });
          simpan('bhm_laporan_error', log);
          toast('Terima kasih, laporan tersimpan di HP ini.');
        });
        kartu.appendChild(tombolLapor);
      }

      hasil.appendChild(kartu);

      // Catatan kejujuran mesin (bukan AI)
      hasil.appendChild(buat('p', 'mt-3 text-[11px] italic leading-relaxed text-slate-500',
        'Mesin ini mencocokkan kata kunci, bukan memahami cerita seperti AI. ' +
        'Database: ' + (data.stats ? data.stats.jumlah_pasal : 0) + ' pasal pilihan + ' +
        (data.stats && data.stats.jumlah_kuhp ? data.stats.jumlah_kuhp + ' pasal KUHP (UU 1/2023) + ' : '') + 'indeks ' +
        (data.stats ? data.stats.jumlah_uu.toLocaleString('id-ID') : 0) + ' undang-undang.'));

      // v6: rincian cara mesin NLP memahami cerita (typo, imbuhan, sinonim)
      const cat = data.nlp && data.nlp.catatan;
      if (cat && (cat.typo.length || cat.sinonim.length || cat.stem.length)) {
        const det = buat('details', 'mt-2 rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-[12px] text-slate-300');
        det.id = 'rincianNLP';
        det.appendChild(buat('summary', 'cursor-pointer font-semibold text-indigo-300', '🧠 Cara mesin memahami ceritamu'));
        const daftar = buat('ul', 'mt-2 list-disc space-y-1 pl-5');
        for (const t of cat.typo.slice(0, 6)) daftar.appendChild(buat('li', '', 'Salah ketik diperbaiki: "' + t.dari + '" dibaca "' + t.jadi + '"'));
        for (const t of cat.sinonim.slice(0, 6)) daftar.appendChild(buat('li', '', 'Sinonim/frasa: "' + t.dari + '" dipahami sebagai ' + t.jadi));
        const uniq = new Map(cat.stem.map((x) => [x.dari, x.jadi]));
        let n = 0;
        for (const [dari, jadi] of uniq) { if (n++ >= 6) break; daftar.appendChild(buat('li', '', 'Imbuhan dipangkas: "' + dari + '" jadi "' + jadi + '"')); }
        det.appendChild(daftar);
        hasil.appendChild(det);
      }

      // Kemungkinan pasal lain (alternatif)
      if (data.alternatif && data.alternatif.length > 0) {
        const wAlt = buat('div', 'animasi-muncul mt-3 rounded-xl border border-slate-700 bg-slate-800/40 p-4');
        wAlt.appendChild(buat('p', 'text-xs font-bold uppercase tracking-wide text-slate-400', 'Kemungkinan lain yang juga cocok'));
        for (const alt of data.alternatif) wAlt.appendChild(kartuPasalRingkas(alt.pasal, alt.cocok));
        hasil.appendChild(wAlt);
      }

      // Pasal KUHP (UU 1/2023) yang cocok dengan cerita
      if (data.kuhpTerkait && data.kuhpTerkait.length > 0) {
        const wK = buat('div', 'animasi-muncul mt-3 rounded-xl border border-slate-700 bg-slate-800/40 p-4');
        wK.appendChild(buat('p', 'text-xs font-bold uppercase tracking-wide text-slate-400', 'Pasal KUHP (UU No. 1 Tahun 2023) yang mungkin terkait'));
        for (const kp of data.kuhpTerkait) {
          const item = buat('div', 'mt-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3');
          const labelK = 'Pasal ' + kp.n + ' KUHP (UU 1/2023)';
          item.appendChild(buat('p', 'text-sm font-bold text-white', labelK + ' — Buku ' + (kp.buku === 1 ? 'Kesatu' : 'Kedua') + ', Bab ' + kp.bab));
          item.appendChild(buat('p', 'mt-1 text-xs leading-relaxed text-slate-300', kp.bunyi));
          item.appendChild(M.blokAwam(M.awamKUHP(kp.n), { ringkas: true }));
          if (kp.cocok && kp.cocok.length) item.appendChild(buat('p', 'mt-1 text-[11px] text-slate-500', 'Cocok lewat kata: ' + kp.cocok.slice(0, 8).join(', ')));
          item.appendChild(M.barisAksi(labelK + ': ' + kp.bunyi, 'kuhp', kp.n, labelK));
          wK.appendChild(item);
        }
        wK.appendChild(buat('p', 'mt-2 text-[11px] italic text-slate-500', 'Teks pasal apa adanya dari salinan resmi UU No. 1 Tahun 2023 (peraturan.bpk.go.id, LN 2023 No. 1). Bukan tafsir hukum.'));
        hasil.appendChild(wK);
      }

      // UU terkait dari indeks besar
      if (data.uuTerkait && data.uuTerkait.length > 0) {
        const wUU = buat('div', 'animasi-muncul mt-3 rounded-xl border border-slate-700 bg-slate-800/40 p-4');
        wUU.appendChild(buat('p', 'text-xs font-bold uppercase tracking-wide text-slate-400', 'Undang-undang terkait'));
        for (const u of data.uuTerkait) {
          const baris = buat('a', 'mt-2 block rounded-lg border border-slate-700 bg-slate-900/60 p-3 transition hover:border-indigo-500/50');
          baris.href = window.BHMMesin.urlResmi(u); baris.target = '_blank'; baris.rel = 'noopener';
          baris.appendChild(buat('p', 'text-sm font-semibold text-white', u.n));
          baris.appendChild(buat('p', 'mt-0.5 text-xs leading-relaxed text-slate-400', u.u));
          if (u.st) baris.appendChild(buat('p', 'mt-1 text-[11px] font-semibold text-amber-300', 'Status: ' + u.st));
          baris.appendChild(buat('p', 'mt-1 text-[11px] text-indigo-300 underline underline-offset-2', 'Buka di JDIH BPK (butuh internet)'));
          wUU.appendChild(baris);
        }
        hasil.appendChild(wUU);
      }

      hasil.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    el('btnAnalisis').addEventListener('click', async () => {
      const cerita = el('inputCerita').value.trim();
      if (cerita.length < 10) {
        toast('Ceritakan dulu masalahnya, minimal beberapa kata.');
        el('inputCerita').focus();
        return;
      }
      el('btnAnalisis').disabled = true;
      try {
        const hasil = await window.BHMMesin.analisis(cerita);
        await tampilkanHasil(hasil);
        const utama = hasil.utama ? hasil.utama.pasal : null;
        window.BHMMudah.tambahRiwayat('analisis', cerita, utama ? utama.kategori : 'tidak ketemu');
        simpan('bhm_analisis_terakhir', { waktu: new Date().toISOString(), cerita, kategori: utama ? utama.kategori : null, pasal: utama ? utama.pasal : null });
        if (utama && !el('inputPerihal').value.trim()) el('inputPerihal').value = utama.kategori;
        if (!el('inputKronologi').value.trim()) el('inputKronologi').value = cerita;
        if (el('lpKronologi') && !el('lpKronologi').value.trim()) el('lpKronologi').value = cerita; // v6: laporan polisi
      } catch (e) {
        toast(e.message || 'Analisis gagal. Coba lagi.');
      } finally {
        el('btnAnalisis').disabled = false;
      }
    });

    el('btnHapusCerita').addEventListener('click', () => {
      el('inputCerita').value = '';
      el('hasilAnalisis').classList.add('hidden');
      el('hasilAnalisis').innerHTML = '';
      el('inputCerita').focus();
    });

    // ---------- Brankas Bukti (Fase 4) ----------
    el('inputGambar').addEventListener('change', () => {
      const berkas = el('inputGambar').files && el('inputGambar').files[0];
      el('namaFileTerpilih').textContent = berkas ? berkas.name : 'Pilih gambar / screenshot';
      el('btnHash').disabled = !berkas;
    });

    el('btnHash').addEventListener('click', async () => {
      const berkas = el('inputGambar').files && el('inputGambar').files[0];
      if (!berkas) { toast('Pilih gambar dulu.'); return; }
      el('btnHash').disabled = true;
      el('btnHash').textContent = 'Mengunci...';
      try {
        const hash = await window.BHMBrankas.hashBerkas(berkas);
        const rekaman = window.BHMBrankas.tambahRekaman({ nama: berkas.name, ukuran: berkas.size, hash });
        const hasilHash = el('hasilHash');
        hasilHash.innerHTML = '';
        hasilHash.classList.remove('hidden');
        const kartu = buat('div', 'animasi-muncul mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4');
        kartu.appendChild(buat('p', 'text-sm font-bold text-emerald-300', '🔒 Bukti terkunci'));
        kartu.appendChild(buat('p', 'mt-1 text-xs text-slate-400', 'Gambar tidak disimpan dan tidak dikirim ke mana pun. Bila gambar diubah sedikit saja, hash-nya berbeda total.'));
        kartu.appendChild(buat('p', 'kode-hash mt-2 text-emerald-200', rekaman.hash));
        hasilHash.appendChild(kartu);
        renderRiwayatHash();
        el('inputGambar').value = '';
        el('namaFileTerpilih').textContent = 'Pilih gambar / screenshot';
      } catch (e) {
        toast(e.message || 'Gagal mengunci bukti.');
      } finally {
        el('btnHash').disabled = true;
        el('btnHash').textContent = 'Kunci Bukti';
      }
    });

    let konfirmasiHapus = null;
    el('btnHapusSemuaHash').addEventListener('click', () => {
      const tombol = el('btnHapusSemuaHash');
      if (konfirmasiHapus) {
        window.BHMBrankas.hapusSemua();
        renderRiwayatHash();
        tombol.textContent = 'Hapus semua';
        clearTimeout(konfirmasiHapus);
        konfirmasiHapus = null;
        toast('Semua rekaman hash dihapus.');
      } else {
        tombol.textContent = 'Yakin? Ketuk lagi';
        konfirmasiHapus = setTimeout(() => {
          tombol.textContent = 'Hapus semua';
          konfirmasiHapus = null;
        }, 3000);
      }
    });

    // ---------- Surat (Fase 5, 30, 14) ----------
    el('inputTanggal').value = new Date().toISOString().slice(0, 10);

    function statusPesan(idStatus, teks, berhasil) {
      const p = el(idStatus);
      p.textContent = teks;
      p.className = 'mt-2 text-sm ' + (berhasil ? 'text-emerald-300' : 'text-amber-300');
      p.classList.remove('hidden');
    }

    el('btnPdf').addEventListener('click', () => {
      const data = {
        nama: el('inputNama').value, lawan: el('inputLawan').value,
        perihal: el('inputPerihal').value, tanggal: el('inputTanggal').value,
        kronologi: el('inputKronologi').value
      };
      const kosong = [];
      if (!data.nama.trim()) kosong.push('nama kamu');
      if (!data.lawan.trim()) kosong.push('pihak yang disomasi');
      if (!data.perihal.trim()) kosong.push('perihal');
      if (!data.tanggal) kosong.push('tanggal');
      if (!data.kronologi.trim()) kosong.push('kronologi');
      if (kosong.length > 0) { statusPesan('statusPdf', 'Lengkapi dulu: ' + kosong.join(', ') + '.', false); return; }
      try {
        window.BHMPdf.buatSomasi(data).save('somasi-bhm.pdf');
        statusPesan('statusPdf', 'PDF somasi berhasil dibuat dan diunduh. Periksa kembali sebelum dikirim.', true);
      } catch (e) {
        statusPesan('statusPdf', e.message, false);
      }
    });

    el('btnKuasa').addEventListener('click', () => {
      const data = {
        pemberi: el('kuasaPemberi').value, penerima: el('kuasaPenerima').value,
        keperluan: el('kuasaKeperluan').value, tanggal: new Date().toISOString().slice(0, 10)
      };
      if (!data.pemberi.trim() || !data.penerima.trim() || !data.keperluan.trim()) {
        statusPesan('statusKuasa', 'Lengkapi dulu ketiga kolom di atas.', false);
        return;
      }
      try {
        window.BHMPdf.buatSuratKuasa(data).save('surat-kuasa-bhm.pdf');
        statusPesan('statusKuasa', 'PDF surat kuasa berhasil dibuat dan diunduh.', true);
      } catch (e) {
        statusPesan('statusKuasa', e.message, false);
      }
    });

    el('btnEkspor').addEventListener('click', () => {
      try {
        window.BHMPdf.buatLaporan({
          analisis: baca('bhm_analisis_terakhir', null),
          bukti: window.BHMBrankas.bacaRiwayat()
        }).save('laporan-bhm.pdf');
        statusPesan('statusEkspor', 'PDF laporan berhasil dibuat dan diunduh.', true);
      } catch (e) {
        statusPesan('statusEkspor', e.message, false);
      }
    });

    // ---------- Audio darurat (Fase 13) ----------
    el('btnAudioDarurat').addEventListener('click', () => window.BHMSuara.putarPeringatan());

    // ---------- Init ----------
    window.BHMMesin.muatDatabase().catch(() => toast('Database pasal gagal dimuat. Muat ulang halaman.'));
    window.BHMMudah.muatAwam();
    window.BHMMudah.daftarAlatFavorit();
    renderRiwayatHash();
    window.BHMAlat.init();
    window.BHMOts.init();
    window.BHMRekam.init();
    window.BHMKamuflase.initKalkulator();
    // Kamuflase aktif setiap kali aplikasi dibuka; buka dengan 3x ketuk layar kalkulator.
    window.BHM.aktifkanKamuflase();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then((reg) => {
          window.__swOk = true;
          // v6: pantau Service Worker baru, tampilkan banner "Pembaruan Tersedia"
          if (window.BHMUpdate) window.BHMUpdate.pantau(reg);
        })
        .catch((e) => {
          window.__swErr = e.name + ': ' + e.message;
          // Dibuka lewat file:// misalnya: aplikasi tetap jalan, offline mode nonaktif.
        });
    }
  });
})();
