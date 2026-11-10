/* ===== BHM v6: fitur baru (fitur-v6.js) =====
   1. Template Laporan Polisi (PDF jsPDF, cadangan window.print + @media print)
   2. Mode Terang / Gelap (class "dark" pada <html>, tersimpan di localStorage "theme")
   3. Banner "Pembaruan Tersedia" (deteksi Service Worker baru + SKIP_WAITING)
   4. Buku Saku Darurat (checklist yang bisa ditandai)
   (Toast "Tersalin!" ada di core.js: BHM.toastNotif, dipakai tombol Salin di mudah.js.)
   Muat SETELAH core.js, pdf.js, dan mudah.js; SEBELUM app.js. */
(function () {
  'use strict';

  const el = (id) => document.getElementById(id);

  // =====================================================================
  // FITUR 1: LAPORAN POLISI (LAPORAN PENGADUAN MASYARAKAT)
  // =====================================================================
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  /** "2026-11-09T14:30" -> "Senin, 9 November 2026, pukul 14.30". */
  function formatWaktuKejadian(nilai) {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(nilai || '');
    if (!m) return (nilai || '').trim();
    const tgl = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    let teks = HARI[tgl.getDay()] + ', ' + tgl.getDate() + ' ' + BULAN[tgl.getMonth()] + ' ' + tgl.getFullYear();
    if (m[4]) teks += ', pukul ' + m[4] + '.' + m[5];
    return teks;
  }

  function tanggalHariIni() {
    const d = new Date();
    return d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear();
  }

  /** Isi surat dalam bentuk data agar dipakai bersama oleh PDF dan cetak cadangan. */
  function susunLaporan(data) {
    return {
      judul: 'LAPORAN PENGADUAN MASYARAKAT',
      tujuan: ['Kepada Yth.', 'Kepala Kepolisian setempat', 'c.q. Kepala Sentra Pelayanan Kepolisian Terpadu (SPKT)', 'di Tempat'],
      perihal: 'Perihal: Laporan pengaduan masyarakat',
      pembuka: 'Dengan hormat, yang bertanda tangan di bawah ini menyampaikan laporan pengaduan atas dugaan suatu peristiwa dengan keterangan sebagai berikut:',
      bagian: [
        { label: 'I. Identitas Pelapor', isi: 'Nama: ' + data.pelapor },
        { label: 'II. Identitas Terlapor', isi: 'Nama: ' + data.terlapor },
        { label: 'III. Waktu Kejadian', isi: data.waktu },
        { label: 'IV. Tempat Kejadian', isi: data.tempat },
        { label: 'V. Uraian Singkat Kejadian', isi: data.kronologi }
      ],
      permohonan: 'Berdasarkan uraian tersebut, Pelapor memohon agar laporan ini diterima, dicatat, dan ditindaklanjuti sesuai dengan ketentuan peraturan perundang-undangan yang berlaku. Pelapor bersedia memberikan keterangan tambahan dan menyerahkan alat bukti yang dimiliki apabila diperlukan.',
      penutup: 'Demikian laporan pengaduan ini dibuat dengan sebenarnya dan atas kesadaran sendiri. Atas perhatian dan tindak lanjut Bapak/Ibu, Pelapor mengucapkan terima kasih.',
      tanggal: tanggalHariIni(),
      pelapor: data.pelapor,
      catatan: 'Draf ini disusun otomatis oleh aplikasi Bantuan Hukum Mandiri dan bukan nasihat hukum. Lengkapi identitas (NIK, alamat, nomor telepon) dan bawa bukti asli saat melapor ke SPKT.'
    };
  }

  /**
   * Membuat dokumen jsPDF Laporan Polisi.
   * @param {{pelapor:string, terlapor:string, waktu:string, tempat:string, kronologi:string}} data
   */
  function buatLaporanPolisi(data) {
    if (!(window.jspdf && window.jspdf.jsPDF)) {
      throw new Error('Pustaka PDF belum termuat. Perlu internet sekali saja untuk memuatnya; setelah itu bisa offline.');
    }
    const L = susunLaporan(data);
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    const kiri = 20, lebar = 170;
    let y = 20;
    const cekHalaman = (tinggi) => { if (y + tinggi > 272) { doc.addPage(); y = 20; } };
    const tulis = (teks, x, opsi) => {
      for (const b of doc.splitTextToSize(teks, (opsi && opsi.lebar) || lebar)) {
        cekHalaman(5.5);
        doc.text(b, x, y);
        y += 5.5;
      }
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(L.judul, 105, y, { align: 'center' });
    y += 4;
    doc.setLineWidth(0.6);
    doc.line(kiri, y, 190, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    L.tujuan.forEach((t, i) => { doc.setFont('helvetica', i === 1 || i === 2 ? 'bold' : 'normal'); doc.text(t, kiri, y); y += 5.5; });
    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.text(L.perihal, kiri, y);
    y += 9;
    doc.setFont('helvetica', 'normal');
    tulis(L.pembuka, kiri);
    y += 3;

    for (const b of L.bagian) {
      cekHalaman(14);
      doc.setFont('helvetica', 'bold');
      doc.text(b.label, kiri, y);
      y += 5.5;
      doc.setFont('helvetica', 'normal');
      tulis(b.isi, kiri + 6, { lebar: lebar - 6 });
      y += 2.5;
    }
    y += 1;
    tulis(L.permohonan, kiri);
    y += 2;
    tulis(L.penutup, kiri);

    y += 6;
    cekHalaman(48);
    doc.text(L.tanggal, 130, y); y += 6;
    doc.text('Hormat saya,', 130, y); y += 2;
    doc.text('Pelapor,', 130, y); y += 24;
    doc.setFont('helvetica', 'bold');
    doc.text(L.pelapor, 130, y, { maxWidth: 60 });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(L.catatan, kiri, 287, { maxWidth: lebar });
    doc.setTextColor(0);
    return doc;
  }

  /** Cadangan bila jsPDF belum termuat: isi #cetak-laporan lalu window.print() (CSS @media print). */
  function cetakLaporanCadangan(data) {
    const L = susunLaporan(data);
    const wadah = el('cetak-laporan');
    wadah.innerHTML = '';
    const tambah = (tag, teks, gaya) => { const n = document.createElement(tag); n.textContent = teks; if (gaya) n.className = gaya; wadah.appendChild(n); return n; };
    tambah('h1', L.judul);
    L.tujuan.forEach((t) => tambah('p', t, 'tujuan'));
    tambah('p', L.perihal, 'perihal');
    tambah('p', L.pembuka);
    for (const b of L.bagian) { tambah('h2', b.label); tambah('p', b.isi, 'isi'); }
    tambah('p', L.permohonan);
    tambah('p', L.penutup);
    const ttd = tambah('div', '', 'ttd');
    [L.tanggal, 'Hormat saya,', 'Pelapor,', '\u00a0', '\u00a0', L.pelapor].forEach((t) => { const p = document.createElement('p'); p.textContent = t; ttd.appendChild(p); });
    tambah('p', L.catatan, 'catatan');
    window.print();
  }

  function pesanStatus(id, teks, berhasil) {
    const p = el(id);
    p.textContent = teks;
    p.className = 'mt-2 text-sm ' + (berhasil ? 'text-emerald-300' : 'text-amber-300');
    p.classList.remove('hidden');
  }

  function pasangLaporan() {
    const tombol = el('btnLaporanPolisi');
    if (!tombol) return;
    // Waktu kejadian bawaan: sekarang (zona waktu perangkat), bisa diubah.
    const sekarang = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    el('lpWaktu').value = sekarang.getFullYear() + '-' + pad(sekarang.getMonth() + 1) + '-' + pad(sekarang.getDate()) + 'T' + pad(sekarang.getHours()) + ':' + pad(sekarang.getMinutes());
    tombol.addEventListener('click', () => {
      const data = {
        pelapor: el('lpPelapor').value.trim(),
        terlapor: el('lpTerlapor').value.trim(),
        waktu: formatWaktuKejadian(el('lpWaktu').value),
        tempat: el('lpTempat').value.trim(),
        kronologi: el('lpKronologi').value.trim()
      };
      const kosong = [];
      if (!data.pelapor) kosong.push('nama pelapor');
      if (!data.terlapor) kosong.push('nama terlapor');
      if (!el('lpWaktu').value) kosong.push('waktu kejadian');
      if (!data.tempat) kosong.push('tempat kejadian');
      if (!data.kronologi) kosong.push('kronologi');
      if (kosong.length) { pesanStatus('statusLaporan', 'Lengkapi dulu: ' + kosong.join(', ') + '.', false); return; }
      try {
        buatLaporanPolisi(data).save('laporan-polisi-bhm.pdf');
        pesanStatus('statusLaporan', 'PDF laporan polisi berhasil dibuat dan diunduh. Lengkapi identitas (NIK, alamat) dan periksa kembali sebelum diserahkan.', true);
      } catch (e) {
        if (!(window.jspdf && window.jspdf.jsPDF)) {
          pesanStatus('statusLaporan', 'Pustaka PDF belum termuat. Membuka dialog cetak: pilih "Simpan sebagai PDF".', false);
          cetakLaporanCadangan(data);
        } else {
          pesanStatus('statusLaporan', e.message, false);
        }
      }
    });
  }

  // =====================================================================
  // FITUR 5: MODE TERANG
  // =====================================================================
  function temaSekarang() { return document.documentElement.classList.contains('dark') ? 'dark' : 'light'; }

  function perbaruiTombolTema() {
    const gelap = temaSekarang() === 'dark';
    const tombol = el('btnTema');
    if (!tombol) return;
    // Mode gelap: tampilkan matahari (ketuk untuk terang). Mode terang: tampilkan bulan.
    el('ikonMatahari').classList.toggle('hidden', !gelap);
    el('ikonBulan').classList.toggle('hidden', gelap);
    tombol.setAttribute('aria-label', gelap ? 'Ganti ke mode terang' : 'Ganti ke mode gelap');
    tombol.setAttribute('aria-pressed', gelap ? 'false' : 'true');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', gelap ? '#0f172a' : '#f1f5f9');
  }

  /** Terapkan tema ('light' | 'dark'): ganti class "dark" pada <html> dan simpan di localStorage. */
  function terapkanTema(tema, simpan) {
    document.documentElement.classList.toggle('dark', tema !== 'light');
    if (simpan !== false) { try { localStorage.setItem('theme', tema); } catch (e) { /* diabaikan */ } }
    perbaruiTombolTema();
  }

  function pasangTema() {
    let tersimpan = null;
    try { tersimpan = localStorage.getItem('theme'); } catch (e) { /* diabaikan */ }
    terapkanTema(tersimpan === 'light' ? 'light' : 'dark', false);
    const tombol = el('btnTema');
    if (tombol) tombol.addEventListener('click', () => terapkanTema(temaSekarang() === 'dark' ? 'light' : 'dark'));
  }

  // =====================================================================
  // FITUR 3: BANNER "PEMBARUAN TERSEDIA" (PWA)
  // =====================================================================
  const BHMUpdate = (function () {
    let pekerjaBaru = null;
    let sudahMuatUlang = false;

    function tampilkan(pekerja) {
      pekerjaBaru = pekerja;
      const b = el('banner-update');
      if (b) b.classList.remove('hidden');
    }

    function muatUlang() {
      const tombol = el('btnMuatUlang');
      if (tombol) { tombol.disabled = true; tombol.textContent = 'Memuat...'; }
      const reload = () => { if (!sudahMuatUlang) { sudahMuatUlang = true; window.location.reload(); } };
      // Setelah Service Worker baru mengambil alih, halaman dimuat ulang.
      if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('controllerchange', reload);
      if (pekerjaBaru) pekerjaBaru.postMessage('SKIP_WAITING');
      // Cadangan: bila pekerja tak merespons, muat ulang tetap jalan.
      setTimeout(reload, pekerjaBaru ? 2500 : 0);
    }

    /** Dipanggil app.js setelah serviceWorker.register() berhasil. */
    function pantau(reg) {
      if (!reg) return;
      if (reg.waiting && navigator.serviceWorker.controller) tampilkan(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const baru = reg.installing;
        if (!baru) return;
        baru.addEventListener('statechange', () => {
          // "installed" + sudah ada controller lama = ini PEMBARUAN (bukan pemasangan pertama)
          if (baru.state === 'installed' && navigator.serviceWorker.controller) tampilkan(baru);
        });
      });
      // Cek pembaruan saat aplikasi kembali dibuka dan tiap 30 menit.
      const cek = () => { reg.update().catch(() => {}); };
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') cek(); });
      setInterval(cek, 30 * 60 * 1000);
      window.__bhmCekUpdate = cek;
    }

    function init() {
      const m = el('btnMuatUlang');
      if (m) m.addEventListener('click', muatUlang);
      const t = el('btnTutupBanner');
      if (t) t.addEventListener('click', () => el('banner-update').classList.add('hidden'));
    }
    return { pantau, init, tampilkan };
  })();

  // =====================================================================
  // FITUR 4: BUKU SAKU DARURAT
  // =====================================================================
  function pasangBukuSaku() {
    document.querySelectorAll('#daftarBukuSaku .poin-saku').forEach((b) => {
      b.addEventListener('click', () => {
        const aktif = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', aktif ? 'true' : 'false'); // sengaja TIDAK disimpan: privasi
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    pasangTema();
    pasangLaporan();
    BHMUpdate.init();
    pasangBukuSaku();
  });

  window.BHMUpdate = BHMUpdate;
  window.BHMTema = { terapkanTema, temaSekarang };
  if (window.BHMPdf) window.BHMPdf.buatLaporanPolisi = buatLaporanPolisi;
  else window.BHMPdf = { buatLaporanPolisi };
})();
