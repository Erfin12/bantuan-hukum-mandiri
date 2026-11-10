/* ===== Fase 25: QR Code darurat berisi ringkasan kasus terenkripsi =====
   Ringkasan dienkripsi AES-GCM dengan PIN pilihan pengguna (WebCrypto),
   lalu dirender sebagai QR. Hanya pemegang PIN yang bisa membaca isinya. */
(function () {
  'use strict';

  const b64 = (buf) => btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));

  async function kunciDariPin(pin, garam) {
    const bahan = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: garam, iterations: 100000, hash: 'SHA-256' },
      bahan, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
  }

  /** Enkripsi teks dengan PIN -> string payload untuk QR. */
  async function enkripsi(teks, pin) {
    const garam = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const kunci = await kunciDariPin(pin, garam);
    const sandi = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kunci, new TextEncoder().encode(teks));
    return 'BHM1:' + b64(garam) + ':' + b64(iv) + ':' + b64(sandi);
  }

  /** Dekripsi payload QR dengan PIN (untuk pengecekan isi). */
  async function dekripsi(payload, pin) {
    const bagian = payload.split(':');
    if (bagian.length !== 4 || bagian[0] !== 'BHM1') throw new Error('Format QR tidak dikenali.');
    const dariB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
    const kunci = await kunciDariPin(pin, dariB64(bagian[1]));
    const polos = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: dariB64(bagian[2]) }, kunci, dariB64(bagian[3]));
    return new TextDecoder().decode(polos);
  }

  /** Render payload sebagai QR ke canvas. */
  function gambarQR(canvas, payload) {
    if (typeof qrcode === 'undefined') {
      throw new Error('Pustaka QR belum termuat. Perlu internet sekali; setelah itu bisa offline.');
    }
    const qr = qrcode(0, 'M');
    qr.addData(payload);
    qr.make();
    const jumlah = qr.getModuleCount();
    const skala = Math.max(2, Math.floor(280 / jumlah));
    canvas.width = canvas.height = jumlah * skala;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#e2e8f0';
    for (let r = 0; r < jumlah; r++) {
      for (let c = 0; c < jumlah; c++) {
        if (qr.isDark(r, c)) ctx.fillRect(c * skala, r * skala, skala, skala);
      }
    }
  }

  window.BHMQr = { enkripsi, dekripsi, gambarQR };
})();
