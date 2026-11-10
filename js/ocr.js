/* ===== Fase 21: Ekstraktor bukti OCR (Tesseract.js via CDN) =====
   Membaca teks dari gambar screenshot/surat di perangkat. Pemakaian
   pertama butuh internet untuk mengunduh mesin & bahasa; setelah itu
   dicache service worker sehingga bisa offline. */
(function () {
  'use strict';

  async function ocrGambar(berkas, onProgres) {
    if (typeof Tesseract === 'undefined') {
      throw new Error('Mesin OCR belum termuat. Perlu internet sekali untuk mengunduhnya; setelah itu bisa offline.');
    }
    const hasil = await Tesseract.recognize(berkas, 'ind', {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgres) onProgres(Math.round(m.progress * 100));
      }
    });
    return (hasil && hasil.data && hasil.data.text || '').trim();
  }

  window.BHMOcr = { ocrGambar };
})();
