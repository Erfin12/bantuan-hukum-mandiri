/* ===== Fase 35: Mode "Saya Sedang Dengar" — rekam suara lalu kunci hash ===== */
(function () {
  'use strict';

  let perekam = null;
  let potongan = [];

  function init() {
    const btnMulai = document.getElementById('btnRekam');
    const btnStop = document.getElementById('btnStopRekam');
    const status = document.getElementById('statusRekam');
    const hasil = document.getElementById('hasilRekam');

    if (!navigator.mediaDevices || !window.MediaRecorder) {
      status.textContent = 'Browser ini tidak mendukung perekaman suara.';
      status.className = 'mt-2 text-sm text-amber-300';
      status.classList.remove('hidden');
      btnMulai.disabled = true;
      btnMulai.classList.add('opacity-40');
      return;
    }

    btnMulai.addEventListener('click', async () => {
      try {
        const aliran = await navigator.mediaDevices.getUserMedia({ audio: true });
        potongan = [];
        perekam = new MediaRecorder(aliran);
        perekam.ondataavailable = (e) => { if (e.data.size > 0) potongan.push(e.data); };
        perekam.onstop = async () => {
          aliran.getTracks().forEach((t) => t.stop());
          const gumpalan = new Blob(potongan, { type: perekam.mimeType || 'audio/webm' });
          const hash = await window.BHMBrankas.hashBerkas(gumpalan);
          window.BHMBrankas.tambahRekaman({ nama: 'rekaman-' + new Date().toISOString().slice(0, 16).replace('T', '-') + '.webm', ukuran: gumpalan.size, hash });
          window.BHM.renderRiwayatHash();
          hasil.classList.remove('hidden');
          hasil.innerHTML = '';
          const kartu = window.BHM.buat('div', 'animasi-muncul rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4');
          kartu.appendChild(window.BHM.buat('p', 'text-sm font-bold text-emerald-300', '🔒 Rekaman terkunci (' + window.BHM.formatUkuran(gumpalan.size) + ')'));
          kartu.appendChild(window.BHM.buat('p', 'kode-hash mt-2 text-emerald-200', hash));
          const unduh = window.BHM.buat('a', 'mt-2 inline-block rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-300', 'Unduh rekaman (simpan sendiri)');
          unduh.href = URL.createObjectURL(gumpalan);
          unduh.download = 'rekaman-bhm.webm';
          kartu.appendChild(unduh);
          hasil.appendChild(kartu);
          status.classList.add('hidden');
          btnMulai.disabled = false;
          btnStop.disabled = true;
        };
        perekam.start();
        status.textContent = '● Merekam... jaga layar tetap menyala dan halaman ini terbuka.';
        status.className = 'mt-2 text-sm text-rose-300';
        status.classList.remove('hidden');
        btnMulai.disabled = true;
        btnStop.disabled = false;
      } catch (e) {
        status.textContent = 'Mikrofon ditolak atau tidak tersedia: ' + (e.message || e.name);
        status.className = 'mt-2 text-sm text-amber-300';
        status.classList.remove('hidden');
      }
    });

    btnStop.addEventListener('click', () => {
      if (perekam && perekam.state !== 'inactive') perekam.stop();
    });
  }

  window.BHMRekam = { init };
})();
