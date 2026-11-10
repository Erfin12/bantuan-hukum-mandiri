/* ===== BHM v5: kemudahan pakai =====
   - Tombol salin teks pasal sekali ketuk
   - Penjelasan awam (data/awam.json) di bawah teks resmi
   - Favorit pasal + riwayat pencarian (localStorage, tetap di HP)
   - Cetak/unduh PDF hasil analisis (jsPDF, dibuat di HP)
   Semua lokal, zero-knowledge: tidak ada data yang keluar dari HP. */
(function () {
  'use strict';

  const { buat, toast, simpan, baca, formatWaktu } = window.BHM;

  // ---------- Salin teks ----------
  /** Cadangan bila Clipboard API tidak tersedia/ditolak (HTTP biasa, WebView lama, fokus hilang). */
  function salinCadangan(teks) {
    const ta = document.createElement('textarea');
    ta.value = teks;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }

  /** v6: salin ke clipboard; bila berhasil tampilkan toast "Teks berhasil disalin!" selama 2 detik. */
  async function salinTeks(teks) {
    let berhasil = false;
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(teks); berhasil = true; } catch (e) { berhasil = false; }
    }
    if (!berhasil) berhasil = salinCadangan(teks);
    if (berhasil) window.BHM.toastNotif('Teks berhasil disalin!');
    else toast('Gagal menyalin. Salin manual: tahan lama teksnya.');
  }

  // ---------- Penjelasan awam ----------
  let awamDB = null;
  async function muatAwam() {
    if (awamDB) return awamDB;
    try {
      const r = await fetch('data/awam.json');
      awamDB = r.ok ? await r.json() : { kuhp: {}, pasal: {} };
    } catch (e) {
      awamDB = { kuhp: {}, pasal: {} };
    }
    return awamDB;
  }
  function awamKUHP(n) { return (awamDB && awamDB.kuhp && awamDB.kuhp[String(n)]) || null; }
  function awamPasal(id) { return (awamDB && awamDB.pasal && awamDB.pasal[id]) || null; }

  /** Blok penjelasan awam; jujur bila belum tersedia (tampil teks resmi saja). */
  function blokAwam(teks, opts) {
    const wadah = buat('div', 'mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3');
    wadah.appendChild(buat('p', 'text-[11px] font-semibold uppercase tracking-wide text-emerald-300', '🗣️ Bahasa sehari-hari'));
    if (teks) {
      wadah.appendChild(buat('p', 'mt-1 text-sm leading-relaxed text-emerald-100', teks));
    } else {
      wadah.className = 'mt-2 rounded-lg border border-slate-700 bg-slate-900/50 p-3';
      wadah.appendChild(buat('p', 'text-[11px] italic leading-relaxed text-slate-500',
        'Belum ada penjelasan bahasa awam untuk pasal ini - yang tampil di atas teks resmi apa adanya.' +
        (opts && opts.ringkas ? '' : ' Penjelasan awam ditambahkan bertahap, dimulai dari pasal yang paling sering dipakai.')));
    }
    return wadah;
  }

  // ---------- Favorit ----------
  const KUNCI_FAV = 'bhm_favorit';
  function bacaFavorit() { return baca(KUNCI_FAV, []); }
  function adaFavorit(jenis, id) {
    return bacaFavorit().some((f) => f.jenis === jenis && String(f.id) === String(id));
  }
  function tambahFavorit(jenis, id, label) {
    const fav = bacaFavorit();
    if (fav.some((f) => f.jenis === jenis && String(f.id) === String(id))) return;
    fav.unshift({ jenis, id: String(id), label, waktu: new Date().toISOString() });
    simpan(KUNCI_FAV, fav.slice(0, 100));
  }
  function hapusFavorit(jenis, id) {
    simpan(KUNCI_FAV, bacaFavorit().filter((f) => !(f.jenis === jenis && String(f.id) === String(id))));
  }
  /** Tombol bintang: simpan/hapus favorit. */
  function tombolFavorit(jenis, id, label) {
    const b = buat('button', 'rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition');
    b.type = 'button';
    function gambar() {
      const ada = adaFavorit(jenis, id);
      b.className = 'rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ' +
        (ada ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
             : 'border-slate-600 text-slate-400 hover:border-amber-500/60 hover:text-amber-300');
      b.textContent = ada ? '★ Tersimpan' : '☆ Simpan';
    }
    b.addEventListener('click', () => {
      if (adaFavorit(jenis, id)) { hapusFavorit(jenis, id); toast('Dihapus dari favorit.'); }
      else { tambahFavorit(jenis, id, label); toast('Disimpan ke favorit.'); }
      gambar();
    });
    gambar();
    return b;
  }

  /** Tombol salin untuk kartu pasal. */
  function tombolSalin(teks) {
    const b = buat('button', 'rounded-lg border border-slate-600 px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 transition hover:border-indigo-500/60 hover:text-indigo-300', '📋 Salin');
    b.type = 'button';
    b.addEventListener('click', () => salinTeks(teks));
    return b;
  }

  /** Baris aksi (salin + favorit) untuk kartu pasal. */
  function barisAksi(teksSalin, jenis, id, label) {
    const baris = buat('div', 'mt-2 flex flex-wrap gap-2');
    baris.appendChild(tombolSalin(teksSalin));
    if (jenis) baris.appendChild(tombolFavorit(jenis, id, label));
    return baris;
  }

  // ---------- Riwayat pencarian ----------
  const KUNCI_RIW = 'bhm_riwayat_cari';
  function bacaRiwayat() { return baca(KUNCI_RIW, []); }
  function tambahRiwayat(alat, kueri, hasil) {
    const riw = bacaRiwayat();
    riw.unshift({ alat, kueri: (kueri || '').slice(0, 160), hasil: hasil || null, waktu: new Date().toISOString() });
    simpan(KUNCI_RIW, riw.slice(0, 50));
  }
  function hapusRiwayat(i) {
    const riw = bacaRiwayat();
    riw.splice(i, 1);
    simpan(KUNCI_RIW, riw);
  }

  // ---------- Cetak / PDF hasil analisis ----------
  function buatPDFAnalisis(data, cerita, peran) {
    if (!(window.jspdf && window.jspdf.jsPDF)) {
      throw new Error('Pustaka PDF belum termuat. Perlu internet sekali saja untuk memuatnya; setelah itu bisa offline.');
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const kiri = 18, lebar = 174;
    let y = 18;

    function garis() {
      doc.setDrawColor(120); doc.setLineWidth(0.4);
      doc.line(kiri, y, 210 - kiri, y); y += 6;
    }
    function judul(t) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
      doc.text(t, 105, y, { align: 'center' }); y += 7;
    }
    function kepala(t) {
      if (y > 262) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(30);
      doc.text(t, kiri, y); y += 5.5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40);
    }
    function isi(t) {
      if (!t) return;
      const baris = doc.splitTextToSize(String(t), lebar);
      for (const b of baris) {
        if (y > 272) { doc.addPage(); y = 20; }
        doc.text(b, kiri, y); y += 5;
      }
      y += 1.5;
    }
    function spasi(n) { y += (n || 3); }

    judul('HASIL ANALISIS HUKUM');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(110);
    doc.text('Disusun oleh aplikasi Bantuan Hukum Mandiri di HP pengguna - ' +
      new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), 105, y, { align: 'center' });
    y += 5; doc.setTextColor(40); garis();

    kepala('Posisi saya');
    isi(peran === 'korban' ? 'Korban / pelapor' : 'Pihak yang dilaporkan');
    kepala('Cerita singkat');
    isi(cerita);
    spasi();

    const utama = data.utama ? data.utama.pasal : null;
    if (!utama) {
      kepala('Hasil');
      isi('Pasal tidak ditemukan oleh mesin pencocokan kata kunci. Disarankan konsultasi ke LBH terdekat.');
    } else {
      const sikap = peran === 'korban' ? utama.logika_triase.sikap_korban : utama.logika_triase.sikap_pelaku;
      const saran = peran === 'korban' ? utama.logika_triase.saran_korban : utama.logika_triase.saran_pelaku;
      kepala('Pasal utama: ' + utama.kategori);
      isi(utama.pasal);
      isi('Sikap yang disarankan: ' + sikap);
      kepala('Bunyi pasal (teks asli)');
      isi(utama.isi);
      kepala('Ancaman hukuman');
      isi(utama.ancaman);
      const awam = awamPasal(utama.id);
      if (awam) { kepala('Penjelasan bahasa sehari-hari'); isi(awam); }
      kepala('Saran untuk saya');
      isi(saran);
      if (utama.catatan) { kepala('Catatan'); isi(utama.catatan); }
      kepala('Langkah selanjutnya');
      const langkah = peran === 'korban'
        ? ['Amankan bukti dan kunci di Brankas Bukti aplikasi', 'Pertimbangkan somasi ke pihak lawan', 'Lapor ke Polisi (110) atau konsultasi ke LBH terdekat']
        : ['Hentikan perbuatannya sekarang', 'Pulihkan kerugian korban dan minta maaf tertulis', 'Siapkan pendamping hukum bila dilaporkan'];
      langkah.forEach((l, i) => isi((i + 1) + '. ' + l));
      kepala('Sumber resmi');
      isi(utama.sumber_resmi || '-');
      spasi();
    }

    if (data.alternatif && data.alternatif.length) {
      kepala('Kemungkinan pasal lain');
      data.alternatif.forEach((a) => {
        isi('- ' + a.pasal.kategori + ': ' + a.pasal.pasal);
        isi('  Ancaman: ' + a.pasal.ancaman);
      });
      spasi();
    }

    if (data.kuhpTerkait && data.kuhpTerkait.length) {
      kepala('Pasal KUHP (UU No. 1 Tahun 2023) yang mungkin terkait');
      data.kuhpTerkait.forEach((kp) => {
        isi('Pasal ' + kp.n + ' - Buku ' + (kp.buku === 1 ? 'Kesatu' : 'Kedua') + ', Bab ' + kp.bab);
        isi(kp.bunyi);
        const aw = awamKUHP(kp.n);
        if (aw) isi('Bahasa sehari-hari: ' + aw);
        spasi(1);
      });
      spasi();
    }

    if (data.uuTerkait && data.uuTerkait.length) {
      kepala('Undang-undang terkait');
      data.uuTerkait.forEach((u) => {
        isi('- ' + u.n + (u.st ? ' [Status: ' + u.st + ']' : ''));
        isi('  ' + u.u);
        isi('  https://peraturan.bpk.go.id/Details/' + u.d + '/' + u.s);
      });
    }

    // Catatan kaki di tiap halaman
    const hal = doc.getNumberOfPages();
    for (let i = 1; i <= hal; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setTextColor(130);
      doc.text('Dokumen ini bukan nasihat hukum. Analisis memakai pencocokan kata kunci, bukan AI. Konsultasikan ke LBH/pengacara. Halaman ' + i + '/' + hal,
        kiri, 290, { maxWidth: lebar });
    }
    return doc;
  }

  // ---------- Alat: Favorit & Riwayat ----------
  function daftarAlatFavorit() {
    const { KELAS_TOMBOL2, kartuAlat } = window.BHMAlat;
    window.BHMAlat.daftar({
      id: 'favorit', ikon: '⭐', judul: 'Favorit & Riwayat',
      ringkas: 'Pasal yang kamu simpan dan pencarian terakhirmu - semua tersimpan di HP ini saja',
      render() {
        const k = kartuAlat('⭐ Favorit & Riwayat',
          'Semua tersimpan lokal di HP ini (localStorage), tidak dikirim ke mana pun. Hapus kapan saja.');

        // Favorit
        k.appendChild(buat('p', 'mt-3 text-xs font-bold uppercase tracking-wide text-slate-400', 'Pasal favorit'));
        const wadahFav = buat('div', 'mt-2');
        k.appendChild(wadahFav);

        async function gambarFav() {
          const fav = bacaFavorit();
          wadahFav.innerHTML = '';
          if (!fav.length) {
            wadahFav.appendChild(buat('p', 'text-sm text-slate-500', 'Belum ada pasal favorit. Ketuk tombol "☆ Simpan" di kartu pasal mana pun.'));
            return;
          }
          for (const f of fav) {
            const item = buat('div', 'mt-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3');
            const atas = buat('div', 'flex items-start justify-between gap-2');
            atas.appendChild(buat('p', 'text-sm font-semibold text-white', f.label));
            const hapus = buat('button', 'shrink-0 rounded-lg border border-slate-600 px-2 py-1 text-[11px] font-semibold text-slate-400 transition hover:border-rose-500/60 hover:text-rose-300', 'Hapus');
            hapus.type = 'button';
            hapus.addEventListener('click', () => { hapusFavorit(f.jenis, f.id); gambarFav(); toast('Dihapus dari favorit.'); });
            atas.appendChild(hapus);
            item.appendChild(atas);
            item.appendChild(buat('p', 'mt-0.5 text-[11px] text-slate-500', 'Disimpan ' + formatWaktu(f.waktu)));
            if (f.jenis === 'kuhp') {
              const buka = buat('button', KELAS_TOMBOL2 + ' mt-2 w-full', 'Buka pasal ' + f.id);
              buka.type = 'button';
              buka.addEventListener('click', async () => {
                const e = await window.BHMMesin.bacaPasal(Number(f.id));
                item.querySelectorAll('.detail-fav').forEach((x) => x.remove());
                if (e && window.BHMKuhp && window.BHMKuhp.kartuPasal) {
                  const d = buat('div', 'detail-fav');
                  d.appendChild(await window.BHMKuhp.kartuPasal(e));
                  item.appendChild(d);
                }
              });
              item.appendChild(buka);
            }
            wadahFav.appendChild(item);
          }
          const hapusSemua = buat('button', 'mt-3 text-xs font-semibold text-rose-400 transition hover:text-rose-300', 'Hapus semua favorit');
          hapusSemua.type = 'button';
          hapusSemua.addEventListener('click', () => {
            simpan(KUNCI_FAV, []); gambarFav(); toast('Semua favorit dihapus.');
          });
          wadahFav.appendChild(hapusSemua);
        }

        // Riwayat
        k.appendChild(buat('p', 'mt-5 text-xs font-bold uppercase tracking-wide text-slate-400', 'Riwayat pencarian'));
        const wadahRiw = buat('div', 'mt-2');
        k.appendChild(wadahRiw);

        function gambarRiw() {
          const riw = bacaRiwayat();
          wadahRiw.innerHTML = '';
          if (!riw.length) {
            wadahRiw.appendChild(buat('p', 'text-sm text-slate-500', 'Belum ada riwayat. Pencarian di Analisis Hukum dan alat KUHP 2023 akan tercatat di sini.'));
            return;
          }
          riw.forEach((r, i) => {
            const item = buat('div', 'mt-2 rounded-xl border border-slate-700 bg-slate-900/60 p-3');
            const atas = buat('div', 'flex items-start justify-between gap-2');
            const info = buat('div', 'min-w-0');
            info.appendChild(buat('p', 'text-sm text-slate-200', (r.alat === 'analisis' ? '🔍 Analisis: ' : '⚖️ KUHP: ') + r.kueri));
            if (r.hasil) info.appendChild(buat('p', 'mt-0.5 text-[11px] text-indigo-300', 'Hasil: ' + r.hasil));
            info.appendChild(buat('p', 'mt-0.5 text-[11px] text-slate-500', formatWaktu(r.waktu)));
            atas.appendChild(info);
            const hapus = buat('button', 'shrink-0 rounded-lg border border-slate-600 px-2 py-1 text-[11px] font-semibold text-slate-400 transition hover:border-rose-500/60 hover:text-rose-300', 'Hapus');
            hapus.type = 'button';
            hapus.addEventListener('click', () => { hapusRiwayat(i); gambarRiw(); toast('Riwayat dihapus.'); });
            atas.appendChild(hapus);
            item.appendChild(atas);
            wadahRiw.appendChild(item);
          });
          const hapusSemua = buat('button', 'mt-3 text-xs font-semibold text-rose-400 transition hover:text-rose-300', 'Hapus semua riwayat');
          hapusSemua.type = 'button';
          hapusSemua.addEventListener('click', () => {
            simpan(KUNCI_RIW, []); gambarRiw(); toast('Semua riwayat dihapus.');
          });
          wadahRiw.appendChild(hapusSemua);
        }

        gambarFav();
        gambarRiw();
        return k;
      }
    });
  }

  window.BHMMudah = {
    salinTeks, muatAwam, awamKUHP, awamPasal, blokAwam,
    bacaFavorit, adaFavorit, tambahFavorit, hapusFavorit,
    tombolFavorit, tombolSalin, barisAksi,
    bacaRiwayat, tambahRiwayat, hapusRiwayat,
    buatPDFAnalisis, daftarAlatFavorit
  };
})();
