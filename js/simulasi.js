/* ===== Fase 27: Simulasi interogasi (roleplay berbasis skrip lokal) =====
   Latihan mental menghadapi pertanyaan tegas ala pemeriksaan. Ini skrip
   aturan tetap di perangkat, BUKAN AI sungguhan — dicantumkan jujur di UI. */
(function () {
  'use strict';

  const SESI = [
    {
      tanya: 'Anda yakin kejadiannya persis seperti yang Anda ceritakan? Coba ulangi kronologinya dari awal!',
      tips: 'Jawab tenang dan konsisten dengan bukti. Tidak apa-apa berkata "sesuai yang saya alami" — jangan menambah detail karangan.'
    },
    {
      tanya: 'Kenapa Anda baru melapor sekarang? Kalau benar kejadiannya, harusnya langsung lapor!',
      tips: 'Jeda melapor itu wajar (takut, mengumpulkan bukti, mengurus keluarga). Jelaskan alasannya apa adanya.'
    },
    {
      tanya: 'Apa bukti Anda? Kalau tidak ada bukti, ini cuma tuduhan.',
      tips: 'Sebutkan bukti yang sudah kamu kunci: screenshot, hash di Brankas Bukti, visum, saksi. Jangan mengarang bukti yang tidak ada.'
    },
    {
      tanya: 'Jangan-jangan Anda sendiri yang punya masalah dengan orang itu? Biasanya ada dendam.',
      tips: 'Tetap fokus pada fakta kejadian, bukan emosi. Jawab: "Saya melaporkan kejadiannya, bukan orangnya."'
    },
    {
      tanya: 'Kalau nanti keterangan Anda berubah-ubah, Anda bisa dianggap memberi keterangan palsu. Paham?',
      tips: 'Ini teknik menekan. Katakan kamu akan menjawab sesuai yang kamu alami dan ketahui. Kamu berhak membaca ulang BAP sebelum tanda tangan.'
    },
    {
      tanya: 'Anda berhak didampingi penasihat hukum. Mau pakai atau tidak? Kalau tidak, tanda tangan di sini.',
      tips: 'Untuk ancaman pidana mati, seumur hidup, atau 15 tahun ke atas, pendampingan hukum itu WAJIB. Untuk ancaman 5 tahun ke atas, wajib bila kamu tidak mampu (Pasal 155 KUHAP baru UU 20/2025). Kamu berhak minta didampingi dan tidak dipaksa menandatangani apa pun.'
    }
  ];

  function buatSesi() {
    let indeks = 0;
    return {
      /** Ambil pertanyaan berikutnya; null bila sesi habis. */
      berikutnya() {
        if (indeks >= SESI.length) return null;
        const q = SESI[indeks];
        indeks += 1;
        return { nomor: indeks, total: SESI.length, tanya: q.tanya, tips: q.tips };
      },
      sisa() { return SESI.length - indeks; }
    };
  }

  window.BHMSimulasi = { buatSesi };
})();
