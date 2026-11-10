/* ===== Fase 13 & 23: Audio darurat + kendali suara ===== */
(function () {
  'use strict';

  // ---------- Fase 13: Audio darurat (text-to-speech, bekerja offline) ----------
  function putarPeringatan() {
    if (!window.speechSynthesis) {
      window.BHM.toast('Browser ini tidak mendukung suara.');
      return;
    }
    speechSynthesis.cancel();
    const ucap = new SpeechSynthesisUtterance(
      'Perhatian. Tindakan Anda terekam dan dilaporkan. Saya punya bukti dan akan menempuh jalur hukum. Jauhi saya sekarang.'
    );
    ucap.lang = 'id-ID';
    ucap.rate = 0.95;
    ucap.pitch = 0.9;
    ucap.volume = 1;
    speechSynthesis.speak(ucap);
  }

  // ---------- Fase 23: Mode suara total (Web Speech API) ----------
  const Pengenal = window.SpeechRecognition || window.webkitSpeechRecognition;
  let pengenal = null;
  let aktif = false;

  function didukung() { return Boolean(Pengenal); }

  function jalankanPerintah(teks, handler) {
    const t = teks.toLowerCase();
    if (t.includes('analisis') || t.includes('periksa')) return handler.analisis();
    if (t.includes('hapus')) return handler.hapus();
    if (t.includes('brankas')) return handler.ke('brankas');
    if (t.includes('surat') || t.includes('somasi')) return handler.ke('surat');
    if (t.includes('alat')) return handler.ke('alat');
    if (t.includes('beranda') || t.includes('home')) return handler.ke('beranda');
    if (t.includes('darurat') || t.includes('peringatan')) { putarPeringatan(); return 'Memutar suara peringatan.'; }
    return null; // bukan perintah -> dianggap dikte
  }

  /** Mulai/berhenti mendengar. onTeks(teks, apakahPerintahDikenal) dipanggil tiap hasil. */
  function nyalakan(onTeks, handler) {
    if (!Pengenal) return false;
    if (pengenal) pengenal.abort();
    pengenal = new Pengenal();
    pengenal.lang = 'id-ID';
    pengenal.continuous = true;
    pengenal.interimResults = false;
    pengenal.onresult = (e) => {
      const teks = e.results[e.results.length - 1][0].transcript.trim();
      const hasil = jalankanPerintah(teks, handler);
      onTeks(teks, hasil);
    };
    pengenal.onend = () => {
      // continuous sering berhenti sendiri; nyalakan ulang bila masih aktif.
      if (aktif) { try { pengenal.start(); } catch (e) {} }
    };
    pengenal.start();
    aktif = true;
    return true;
  }

  function matikan() {
    aktif = false;
    if (pengenal) pengenal.stop();
  }

  window.BHMSuara = { putarPeringatan, didukung, nyalakan, matikan };
})();
