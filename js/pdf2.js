/* ===== Fase 30 & 14: Surat Kuasa Darurat + Ekspor Berkas (jsPDF) ===== */
(function () {
  'use strict';

  function siapPDF() {
    if (!(window.jspdf && window.jspdf.jsPDF)) {
      throw new Error('Pustaka PDF belum termuat. Perlu koneksi internet sekali saja untuk memuatnya; setelah itu bisa offline.');
    }
    return window.jspdf.jsPDF;
  }

  function tulisParagraf(doc, daftar, y, marginKiri, lebar) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    for (const p of daftar) {
      if (p === '') { y += 4; continue; }
      for (const b of doc.splitTextToSize(p, lebar)) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(b, marginKiri, y);
        y += 5.5;
      }
      y += 2;
    }
    return y;
  }

  function catatanKaki(doc) {
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text('Draf ini disusun otomatis oleh aplikasi Bantuan Hukum Mandiri dan bukan nasihat hukum. Periksa kembali sebelum digunakan.', 20, 287, { maxWidth: 170 });
    doc.setTextColor(0);
  }

  // ---------- Fase 30: Surat Kuasa ----------
  function buatSuratKuasa(data) {
    const jsPDF = siapPDF();
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const tgl = window.BHMPdf.formatTanggalISO(data.tanggal);
    let y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('SURAT KUASA', 105, y, { align: 'center' });
    y += 4;
    doc.setLineWidth(0.6);
    doc.line(20, y, 190, y);
    y += 10;

    y = tulisParagraf(doc, [
      'Yang bertanda tangan di bawah ini:',
      'Nama: ' + data.pemberi.trim(),
      '',
      'Selanjutnya disebut sebagai Pemberi Kuasa, dengan ini memberikan kuasa penuh kepada:',
      '',
      'Nama: ' + data.penerima.trim(),
      '',
      'Selanjutnya disebut sebagai Penerima Kuasa, untuk dan atas nama Pemberi Kuasa melakukan hal-hal berikut:',
      data.keperluan.trim(),
      'Kuasa ini berlaku sejak tanggal ditandatangani sampai dengan dicabut secara tertulis oleh Pemberi Kuasa. ' +
        'Segala tindakan Penerima Kuasa dalam batas keperluan tersebut di atas adalah tanggung jawab Pemberi Kuasa.',
      'Demikian surat kuasa ini dibuat dengan sadar dan tanpa paksaan dari pihak mana pun.'
    ], y, 20, 170);

    y += 8;
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.text(tgl, 130, y); y += 6;
    doc.text('Pemberi Kuasa,', 30, y);
    doc.text('Penerima Kuasa,', 130, y);
    y += 24;
    doc.setFont('helvetica', 'bold');
    doc.text(data.pemberi.trim(), 30, y);
    doc.text(data.penerima.trim(), 130, y);
    catatanKaki(doc);
    return doc;
  }

  // ---------- Fase 14: Ekspor berkas lengkap ----------
  function buatLaporan({ analisis, bukti }) {
    const jsPDF = siapPDF();
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    let y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('LAPORAN BERKAS - BANTUAN HUKUM MANDIRI', 105, y, { align: 'center' });
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Disusun: ' + window.BHMPdf.formatTanggalISO(new Date().toISOString().slice(0, 10)), 105, y, { align: 'center' });
    y += 4;
    doc.setLineWidth(0.6);
    doc.line(20, y, 190, y);
    y += 8;

    const bagianCerita = ['1. CERITA / KRONOLOGI'];
    if (analisis && analisis.cerita) {
      bagianCerita.push(analisis.cerita);
    } else {
      bagianCerita.push('(Belum ada cerita yang dianalisis.)');
    }
    y = tulisParagraf(doc, bagianCerita, y, 20, 170);
    y += 4;

    const bagianAnalisis = ['2. HASIL ANALISIS KATA KUNCI'];
    if (analisis && analisis.pasal) {
      bagianAnalisis.push('Kategori: ' + analisis.kategori, 'Rujukan: ' + analisis.pasal);
    } else {
      bagianAnalisis.push('(Belum ada analisis.)');
    }
    y = tulisParagraf(doc, bagianAnalisis, y, 20, 170);
    y += 4;

    const bagianBukti = ['3. BUKTI TERKUNCI (SHA-256)'];
    if (bukti && bukti.length > 0) {
      bukti.forEach((b, i) => {
        bagianBukti.push((i + 1) + '. ' + b.nama + ' (' + window.BHM.formatUkuran(b.ukuran) + ', dikunci ' + window.BHM.formatWaktu(b.waktu) + ')', '   Hash: ' + b.hash);
      });
    } else {
      bagianBukti.push('(Belum ada bukti yang dikunci.)');
    }
    y = tulisParagraf(doc, bagianBukti, y, 20, 170);
    y += 4;

    tulisParagraf(doc, [
      'Catatan: dokumen ini dibuat sepenuhnya di perangkat pengguna. Hash SHA-256 di atas membuktikan isi berkas tidak berubah sejak waktu penguncian; bawa berkas asli saat verifikasi.'
    ], y, 20, 170);
    catatanKaki(doc);
    return doc;
  }

  // Gabungkan ke modul PDF utama.
  window.BHMPdf.buatSuratKuasa = buatSuratKuasa;
  window.BHMPdf.buatLaporan = buatLaporan;
})();
