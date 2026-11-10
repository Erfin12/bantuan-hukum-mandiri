/* ===== Fase 4: Brankas Bukti (hash SHA-256 dengan WebCrypto) =====
   Gambar dibaca sebagai ArrayBuffer lalu di-hash sepenuhnya di browser.
   Gambar TIDAK pernah diunggah; yang tersimpan di localStorage hanya
   kode hash, nama berkas, ukuran, dan waktu penguncian. */
(function () {
  'use strict';

  const KUNCI_SIMPANAN = 'bhm_brankas_bukti_v1';

  /**
   * Menghitung hash SHA-256 sebuah File/Blob menjadi string HEX.
   * @param {File|Blob} berkas
   * @returns {Promise<string>} hash hex 64 karakter
   */
  async function hashBerkas(berkas) {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('WebCrypto tidak tersedia. Buka aplikasi lewat HTTPS atau localhost.');
    }
    const buffer = await berkas.arrayBuffer();
    const digest = await window.crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /** Membaca seluruh rekaman bukti dari localStorage. */
  function bacaRiwayat() {
    try {
      const mentah = localStorage.getItem(KUNCI_SIMPANAN);
      const data = mentah ? JSON.parse(mentah) : [];
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  /** Menyimpan daftar rekaman ke localStorage. */
  function tulisRiwayat(daftar) {
    localStorage.setItem(KUNCI_SIMPANAN, JSON.stringify(daftar));
  }

  /**
   * Menambah satu rekaman bukti (tanpa menyimpan gambar).
   * @returns {object} rekaman yang tersimpan
   */
  function tambahRekaman({ nama, ukuran, hash }) {
    const daftar = bacaRiwayat();
    const rekaman = {
      id: 'bukti-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
      nama,
      ukuran,
      hash,
      waktu: new Date().toISOString()
    };
    daftar.unshift(rekaman);
    tulisRiwayat(daftar);
    return rekaman;
  }

  /** Menghapus satu rekaman berdasarkan id. Mengembalikan true bila ada yang terhapus. */
  function hapusRekaman(id) {
    const daftar = bacaRiwayat();
    const sisa = daftar.filter((r) => r.id !== id);
    tulisRiwayat(sisa);
    return sisa.length !== daftar.length;
  }

  /** Mengosongkan seluruh brankas. */
  function hapusSemua() {
    localStorage.removeItem(KUNCI_SIMPANAN);
  }

  window.BHMBrankas = { hashBerkas, bacaRiwayat, tambahRekaman, hapusRekaman, hapusSemua };
})();
