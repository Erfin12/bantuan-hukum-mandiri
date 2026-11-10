/* ===== BHM v6.2: kartu "Layanan Ini GRATIS" (anti-pungli) =====
   Baris layanan di Beranda bisa dibuka-tutup untuk melihat dasar hukumnya.
   Muat SETELAH core.js dan fitur-v6.js; SEBELUM app.js. */
(function () {
  'use strict';

  function pasangLayananGratis() {
    document.querySelectorAll('#layananGratis .item-gratis').forEach(function (b) {
      b.addEventListener('click', function () {
        const buka = b.getAttribute('aria-expanded') !== 'true';
        b.setAttribute('aria-expanded', buka ? 'true' : 'false');
        const panel = document.getElementById(b.getAttribute('aria-controls'));
        if (panel) panel.classList.toggle('hidden', !buka);
        const panah = b.querySelector('.panah-gratis');
        if (panah) panah.style.transform = buka ? 'rotate(90deg)' : '';
      });
    });
  }

  document.addEventListener('DOMContentLoaded', pasangLayananGratis);
})();
