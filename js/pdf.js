/* ===== Fase 5: Generator PDF surat somasi (jsPDF) =====
   Menyusun draf somasi berbahasa Indonesia baku. PDF dibuat penuh di
   browser memakai jsPDF; tidak ada data yang dikirim ke server. */
(function () {
  'use strict';

  /** Memastikan pustaka jsPDF sudah termuat dari CDN. */
  function jsPDFSiap() {
    return Boolean(window.jspdf && window.jspdf.jsPDF);
  }

  /** Format tanggal Indonesia: 2026-11-10 -> "10 November 2026". */
  function formatTanggalISO(iso) {
    const bulan = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const bagian = (iso || '').split('-').map(Number);
    if (bagian.length !== 3 || bagian.some(isNaN)) return iso || '';
    return bagian[2] + ' ' + bulan[bagian[1] - 1] + ' ' + bagian[0];
  }

  /**
   * Menyusun dokumen somasi.
   * @param {object} data - {nama, lawan, perihal, tanggal, kronologi}
   * @returns {object} dokumen jsPDF (bisa .save() atau .output())
   */
  function buatSomasi(data) {
    if (!jsPDFSiap()) {
      throw new Error('Pustaka PDF belum termuat. Perlu koneksi internet sekali saja untuk memuatnya; setelah itu bisa offline.');
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    const nama = (data.nama || '').trim();
    const lawan = (data.lawan || '').trim();
    const perihal = (data.perihal || '').trim();
    const tanggalIndo = formatTanggalISO(data.tanggal);
    const kronologi = (data.kronologi || '').trim();

    const marginKiri = 20;
    const lebarTeks = 170; // A4 210mm dikurangi margin kiri-kanan 20mm
    let y = 20;

    // --- Kepala surat ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('SURAT SOMASI', 105, y, { align: 'center' });
    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const nomorSurat = 'Nomor: ' +
      String(Date.now()).slice(-4) + '/SOMASI/BHM/' +
      new Date(data.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { month: '2-digit', year: 'numeric' }).replace('/', '/');
    doc.text(nomorSurat, 105, y, { align: 'center' });
    y += 4;
    doc.setLineWidth(0.6);
    doc.line(marginKiri, y, 190, y);
    y += 10;

    // --- Tujuan ---
    doc.setFontSize(11);
    doc.text('Kepada Yth.', marginKiri, y); y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Saudara/i ' + lawan, marginKiri, y); y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('di Tempat', marginKiri, y); y += 10;

    // --- Perihal ---
    doc.setFont('helvetica', 'bold');
    doc.text('Perihal: Somasi atas dugaan ' + perihal, marginKiri, y); y += 10;
    doc.setFont('helvetica', 'normal');

    // --- Identitas pengirim ---
    const paragraf = [
      'Dengan hormat,',
      'Yang bertanda tangan di bawah ini:',
      'Nama: ' + nama,
      '',
      'Bersama surat ini saya menyampaikan somasi (teguran resmi) kepada Saudara/i terkait dugaan ' +
        perihal + ', dengan kronologi sebagai berikut:',
      kronologi,
      'Perbuatan Saudara/i tersebut diduga melanggar ketentuan hukum yang berlaku di Republik Indonesia ' +
        'dan telah merugikan saya, baik secara materiel maupun immateriel.',
      'Melalui somasi ini, saya menuntut Saudara/i untuk menyelesaikan permasalahan ini secara kekeluargaan ' +
        'paling lambat 7 (tujuh) hari kalender sejak tanggal surat ini, antara lain dengan menghentikan perbuatan ' +
        'tersebut, memulihkan kerugian yang saya alami, dan/atau menyampaikan permintaan maaf secara tertulis.',
      'Apabila tuntutan ini tidak diindahkan, saya akan menempuh jalur hukum yang tersedia, baik pidana maupun ' +
        'perdata, sesuai ketentuan peraturan perundang-undangan yang berlaku.',
      'Demikian somasi ini saya sampaikan. Atas perhatian dan itikad baik Saudara/i, saya ucapkan terima kasih.'
    ];

    doc.setFontSize(11);
    for (const p of paragraf) {
      if (p === '') { y += 4; continue; }
      const baris = doc.splitTextToSize(p, lebarTeks);
      for (const b of baris) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(b, marginKiri, y);
        y += 5.5;
      }
      y += 2;
    }

    // --- Penutup dan tanda tangan ---
    y += 8;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.text(tanggalIndo, 130, y); y += 6;
    doc.text('Hormat saya,', 130, y); y += 24;
    doc.setFont('helvetica', 'bold');
    doc.text(nama, 130, y);
    doc.setFont('helvetica', 'normal');

    // --- Catatan kaki ---
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      'Draf ini disusun otomatis oleh aplikasi Bantuan Hukum Mandiri dan bukan nasihat hukum. Periksa kembali sebelum digunakan; konsultasikan ke LBH bila perlu.',
      marginKiri, 287, { maxWidth: lebarTeks }
    );

    return doc;
  }

  window.BHMPdf = { jsPDFSiap, buatSomasi, formatTanggalISO };
})();
