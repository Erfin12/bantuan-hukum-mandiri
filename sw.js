/* ===== Fase 1-5: Service Worker (mode offline PWA) =====
   Strategi:
   - Berkas lokal & CDN yang dipasang versinya (Tailwind, jsPDF): cache-first.
   - Permintaan lintas origin lain: network-first dengan cadangan cache.
   - Navigasi halaman: network dulu, bila offline sajikan index.html dari cache.
   - v6: pembaruan menunggu persetujuan pengguna lewat banner (SKIP_WAITING). */

const VERSI_CACHE = 'bhm-v6.5'; // v6.5: tombol Traktir Kopi (Trakteer) di Beranda

// Aset inti yang dicache saat pemasangan.
const ASET_INTI = [
  './',
  'index.html',
  'styles.css',
  'manifest.json',
  'data/pasal.json',
  'data/kamus.json',
  'data/lbh.json',
  'data/bahasa.json',
  'data/sinonim.json',
  'data/uu-index.json',
  'data/kuhp.json',
  'data/awam.json',
  'js/core.js',
  'js/app.js',
  'js/ai-engine.js',
  'js/nlp-engine.js',
  'js/hash.js',
  'js/pdf.js',
  'js/pdf2.js',
  'js/ots-rekam.js',
  'js/rekam.js',
  'js/ocr.js',
  'js/qr.js',
  'js/p2p.js',
  'js/simulasi.js',
  'js/suara.js',
  'js/alat.js',
  'js/alat2.js',
  'js/alat3.js',
  'js/jelajah.js',
  'js/kuhp.js',
  'js/mudah.js',
  'js/fitur-v6.js',
  'js/fitur-v62.js',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

const ASET_CDN = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
];

// Pasang: isi cache dengan aset inti. Berkas lokal wajib; CDN dicoba satu-satu
// dengan mode no-cors (respons opaque) karena tidak semua CDN mengirim header CORS.
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(VERSI_CACHE);
      await cache.addAll(ASET_INTI);
      console.log('[BHM SW] aset lokal tercache');
    } catch (e) {
      console.error('[BHM SW] gagal cache lokal:', e && e.message);
      throw e;
    }
    const cache = await caches.open(VERSI_CACHE);
    await Promise.all(ASET_CDN.map(async (url) => {
      try { await cache.add(new Request(url, { mode: 'no-cors' })); } catch (e) { console.warn('[BHM SW] CDN tidak tercache:', url, e && e.message); }
    }));
  })());
  // v6: TIDAK memanggil skipWaiting() otomatis. Versi baru menunggu sampai pengguna
  // menekan "Muat Ulang" di banner (pesan 'SKIP_WAITING' dari halaman, lihat di bawah).
});

// v6: halaman mengirim 'SKIP_WAITING' agar versi baru langsung aktif.
self.addEventListener('message', (event) => {
  const d = event.data;
  if (d === 'SKIP_WAITING' || (d && d.type === 'SKIP_WAITING')) self.skipWaiting();
});

// Aktif: buang cache versi lama.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((daftar) =>
      Promise.all(
        daftar.filter((nama) => nama !== VERSI_CACHE).map((nama) => caches.delete(nama))
      )
    )
  );
  self.clients.claim();
});

// Apakah URL termasuk aset yang aman dilayani cache-first?
function asetStatis(url) {
  if (url.origin === self.location.origin) return true;
  return (
    url.href.startsWith('https://cdn.tailwindcss.com') ||
    url.href.startsWith('https://cdnjs.cloudflare.com/') ||
    url.href.startsWith('https://cdn.jsdelivr.net/')
  );
}

self.addEventListener('fetch', (event) => {
  const permintaan = event.request;
  if (permintaan.method !== 'GET') return;
  const url = new URL(permintaan.url);

  // Navigasi halaman: coba network, offline -> index.html dari cache.
  if (permintaan.mode === 'navigate') {
    event.respondWith(
      fetch(permintaan).catch(() => caches.match('index.html'))
    );
    return;
  }

  if (asetStatis(url)) {
    // Cache-first: sajikan dari cache, sambil memperbarui di latar belakang.
    event.respondWith(
      caches.match(permintaan).then((dariCache) => {
        const dariJaringan = fetch(permintaan)
          .then((respons) => {
            if (respons && respons.ok) {
              const salinan = respons.clone();
              caches.open(VERSI_CACHE).then((cache) => cache.put(permintaan, salinan));
            }
            return respons;
          })
          .catch(() => null);
        return dariCache || dariJaringan;
      })
    );
    return;
  }

  // Lintas origin lain: network-first dengan cadangan cache.
  event.respondWith(
    fetch(permintaan).catch(() => caches.match(permintaan))
  );
});
