/* ===== Fase 28: Jaringan darurat P2P (WebRTC, sinyal manual) =====
   Bertukar ringkasan kasus antar dua HP tanpa server: kode tawaran/jawaban
   disalin manual (misalnya lewat chat apa pun atau dibacakan). Setelah
   tersambung, data mengalir langsung antar perangkat. */
(function () {
  'use strict';

  let koneksi = null;
  let kanal = null;
  const pendengarPesan = [];

  function koneksiBaru(onStatus) {
    tutup();
    // STUN Google hanya dipakai bila perangkat tidak satu jaringan; pemakaian
    // pertama memanggil server STUN, selebihnya data langsung antar HP.
    koneksi = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    koneksi.onconnectionstatechange = () => onStatus && onStatus(koneksi.connectionState);
    return koneksi;
  }

  async function buatTawaran(onStatus, onPesan) {
    koneksiBaru(onStatus);
    kanal = koneksi.createDataChannel('bhm');
    pasangKanal(onPesan);
    await koneksi.setLocalDescription(await koneksi.createOffer());
    await tungguIce();
    return btoa(JSON.stringify(koneksi.localDescription));
  }

  async function terimaTawaran(kodeTawaran, onStatus, onPesan) {
    koneksiBaru(onStatus);
    koneksi.ondatachannel = (e) => { kanal = e.channel; pasangKanal(onPesan); };
    await koneksi.setRemoteDescription(JSON.parse(atob(kodeTawaran)));
    await koneksi.setLocalDescription(await koneksi.createAnswer());
    await tungguIce();
    return btoa(JSON.stringify(koneksi.localDescription));
  }

  async function terimaJawaban(kodeJawaban) {
    if (!koneksi) throw new Error('Belum ada tawaran. Buat tawaran dulu.');
    await koneksi.setRemoteDescription(JSON.parse(atob(kodeJawaban)));
  }

  function pasangKanal(onPesan) {
    kanal.onmessage = (e) => pendengarPesan.concat([onPesan]).forEach((f) => f && f(e.data));
  }

  function tungguIce() {
    return new Promise((selesai) => {
      if (koneksi.iceGatheringState === 'complete') return selesai();
      const batas = setTimeout(selesai, 4000); // jangan menggantung bila ICE lambat
      koneksi.addEventListener('icegatheringstatechange', function cek() {
        if (koneksi.iceGatheringState === 'complete') {
          clearTimeout(batas);
          koneksi.removeEventListener('icegatheringstatechange', cek);
          selesai();
        }
      });
    });
  }

  function kirim(teks) {
    if (!kanal || kanal.readyState !== 'open') throw new Error('Belum tersambung ke HP lain.');
    kanal.send(teks);
  }

  function tutup() {
    try { if (kanal) kanal.close(); } catch (e) {}
    try { if (koneksi) koneksi.close(); } catch (e) {}
    kanal = null;
    koneksi = null;
  }

  window.BHMP2p = { buatTawaran, terimaTawaran, terimaJawaban, kirim, tutup };
})();
