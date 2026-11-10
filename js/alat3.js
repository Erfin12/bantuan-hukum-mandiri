/* ===== Alat BHM (bagian 3): OCR, mode suara, QR darurat, simulasi interogasi,
   jaringan P2P, peta panas kejahatan ===== */
(function () {
  'use strict';

  const { daftar, kartuAlat, KELAS_INPUT, KELAS_TOMBOL, KELAS_TOMBOL2 } = window.BHMAlat;
  const { buat, toast, simpan, baca } = window.BHM;

  // ---------- Fase 21: OCR ----------
  daftar({
    id: 'ocr', ikon: '📷', judul: 'Ekstraktor Bukti (OCR)',
    ringkas: 'Baca teks dari screenshot chat/surat, otomatis isi form cerita',
    render() {
      const k = kartuAlat('📷 Ekstraktor Bukti OCR', 'Pilih gambar berisi teks (screenshot chat, surat); aplikasi membacanya di HP ini dan bisa langsung mengisi kolom cerita. Pemakaian pertama mengunduh mesin OCR (perlu internet); setelah itu bisa offline.');
      const label = buat('label', 'mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-500 bg-slate-900/60 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-indigo-400');
      label.appendChild(buat('span', '', '📎 '));
      const namaSpan = buat('span', '', 'Pilih gambar berisi teks');
      label.appendChild(namaSpan);
      const input = buat('input', 'sr-only'); input.type = 'file'; input.accept = 'image/*';
      label.htmlFor = 'inputOcr';
      input.id = 'inputOcr';
      const tombol = buat('button', KELAS_TOMBOL + ' mt-2 w-full', 'Baca Teks dari Gambar');
      tombol.type = 'button'; tombol.disabled = true;
      const progres = buat('p', 'mt-2 hidden text-xs text-indigo-300');
      const hasil = buat('div', 'mt-3 hidden');
      k.appendChild(label); k.appendChild(input); k.appendChild(tombol); k.appendChild(progres); k.appendChild(hasil);

      input.addEventListener('change', () => {
        const f = input.files && input.files[0];
        namaSpan.textContent = f ? f.name : 'Pilih gambar berisi teks';
        tombol.disabled = !f;
      });

      tombol.addEventListener('click', async () => {
        const f = input.files && input.files[0];
        if (!f) return;
        tombol.disabled = true;
        progres.classList.remove('hidden');
        progres.textContent = 'Menyiapkan mesin OCR...';
        try {
          const teks = await window.BHMOcr.ocrGambar(f, (persen) => { progres.textContent = 'Membaca teks... ' + persen + '%'; });
          progres.classList.add('hidden');
          hasil.innerHTML = '';
          hasil.classList.remove('hidden');
          const kartu2 = buat('div', 'animasi-muncul rounded-xl border border-slate-700 bg-slate-900/60 p-4');
          if (!teks) {
            kartu2.appendChild(buat('p', 'text-sm text-amber-300', 'Tidak ada teks yang terbaca. Coba gambar yang lebih tajam.'));
          } else {
            kartu2.appendChild(buat('p', 'whitespace-pre-wrap text-sm leading-relaxed text-slate-200', teks));
            const pakai = buat('button', KELAS_TOMBOL2 + ' mt-3 w-full', 'Isi Kolom Cerita dengan Teks Ini');
            pakai.type = 'button';
            pakai.addEventListener('click', () => {
              document.getElementById('inputCerita').value = teks;
              window.BHM.goto('analisis');
              toast('Teks hasil OCR dipindahkan ke kolom cerita.');
            });
            kartu2.appendChild(pakai);
          }
          hasil.appendChild(kartu2);
        } catch (e) {
          progres.classList.add('hidden');
          toast(e.message || 'OCR gagal.');
        } finally {
          tombol.disabled = false;
        }
      });
      return k;
    }
  });

  // ---------- Fase 23: Mode suara total ----------
  daftar({
    id: 'suara', ikon: '🎤', judul: 'Mode Suara',
    ringkas: 'Kendalikan aplikasi dengan suara: dikte cerita & perintah navigasi',
    render() {
      const k = kartuAlat('🎤 Mode Suara Total', 'Untuk yang sulit menyentuh layar: ucapkan perintah ("analisis", "buka brankas", "hapus", "darurat") atau diktekan ceritamu.');
      if (!window.BHMSuara.didukung()) {
        k.appendChild(buat('p', 'mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200',
          'Browser ini tidak mendukung pengenalan suara (Web Speech API). Coba Chrome di Android. Fitur lain tetap bisa dipakai normal.'));
        return k;
      }
      const status = buat('p', 'mt-3 text-sm text-slate-400', 'Mikrofon mati.');
      const tombol = buat('button', KELAS_TOMBOL + ' mt-2 w-full', '🎤 Nyalakan Mode Suara');
      tombol.type = 'button';
      const log = buat('div', 'mt-3 hidden rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-300');
      k.appendChild(tombol); k.appendChild(status); k.appendChild(log);
      let menyala = false;

      const handler = {
        analisis: () => { window.BHM.goto('analisis'); document.getElementById('btnAnalisis').click(); return 'Menganalisis.'; },
        hapus: () => { window.BHM.goto('analisis'); document.getElementById('btnHapusCerita').click(); return 'Cerita dihapus.'; },
        ke: (t) => { window.BHM.goto(t); return 'Membuka ' + t + '.'; }
      };

      tombol.addEventListener('click', () => {
        if (menyala) {
          window.BHMSuara.matikan();
          menyala = false;
          tombol.textContent = '🎤 Nyalakan Mode Suara';
          status.textContent = 'Mikrofon mati.';
          return;
        }
        const ok = window.BHMSuara.nyalakan((teks, hasilPerintah) => {
          log.classList.remove('hidden');
          log.textContent = 'Terakhir terdengar: "' + teks + '"' + (hasilPerintah ? ' → ' + hasilPerintah : ' → ditambahkan ke cerita');
          if (!hasilPerintah) {
            window.BHM.goto('analisis');
            const ta = document.getElementById('inputCerita');
            ta.value = (ta.value + ' ' + teks).trim();
          }
        }, handler);
        if (ok) {
          menyala = true;
          tombol.textContent = '⏹ Matikan Mode Suara';
          status.textContent = '🎙️ Mendengarkan... ucapkan perintah atau diktekan cerita.';
          status.className = 'mt-3 text-sm font-semibold text-emerald-300';
        }
      });
      return k;
    }
  });

  // ---------- Fase 25: QR darurat ----------
  daftar({
    id: 'qr', ikon: '🔳', judul: 'QR Code Darurat',
    ringkas: 'QR berisi ringkasan kasus, terenkripsi dengan PIN pilihanmu',
    render() {
      const k = kartuAlat('🔳 QR Code Darurat', 'Ringkasan kasus dienkripsi AES-GCM dengan PIN-mu, lalu dijadikan QR. Pengacara/LBH tinggal memindai dan membukanya dengan PIN yang kamu beri terpisah.');
      const ringkasan = buat('textarea', KELAS_INPUT + ' mt-3'); ringkasan.rows = 3;
      ringkasan.placeholder = 'Ringkasan kasus, cth: Penipuan olshop, kerugian Rp2 jt, bukti terkunci 10 Nov 2026, kontak saya 08xx';
      const pin = buat('input', KELAS_INPUT + ' mt-2'); pin.type = 'password'; pin.placeholder = 'PIN pembuka (minimal 4 digit)';
      const tombol = buat('button', KELAS_TOMBOL + ' mt-2 w-full', 'Buat QR Terenkripsi');
      tombol.type = 'button';
      const hasil = buat('div', 'mt-3 hidden text-center');
      const cekWadah = buat('div', 'mt-4 border-t border-slate-700 pt-3 hidden');
      k.appendChild(ringkasan); k.appendChild(pin); k.appendChild(tombol); k.appendChild(hasil);

      tombol.addEventListener('click', async () => {
        if (ringkasan.value.trim().length < 10) { toast('Isi ringkasan kasus dulu.'); return; }
        if (pin.value.trim().length < 4) { toast('PIN minimal 4 digit.'); return; }
        try {
          const payload = await window.BHMQr.enkripsi(ringkasan.value.trim(), pin.value.trim());
          hasil.innerHTML = '';
          hasil.classList.remove('hidden');
          const canvas = buat('canvas', 'mx-auto rounded-xl border border-slate-700');
          window.BHMQr.gambarQR(canvas, payload);
          hasil.appendChild(canvas);
          hasil.appendChild(buat('p', 'mt-2 text-xs text-slate-400', 'Simpan screenshot QR ini. Isinya tidak bisa dibaca tanpa PIN.'));
          // Area uji buka dengan PIN (bukti enkripsi benar-benar bekerja).
          cekWadah.classList.remove('hidden');
          cekWadah.innerHTML = '';
          cekWadah.appendChild(buat('p', 'text-xs font-semibold text-slate-400', 'Uji buka dengan PIN:'));
          const pinCek = buat('input', KELAS_INPUT + ' mt-2'); pinCek.type = 'password'; pinCek.placeholder = 'Masukkan PIN';
          const tombolCek = buat('button', KELAS_TOMBOL2 + ' mt-2 w-full', 'Buka Isi QR');
          tombolCek.type = 'button';
          const hasilCek = buat('p', 'mt-2 whitespace-pre-wrap text-sm text-slate-200');
          tombolCek.addEventListener('click', async () => {
            try { hasilCek.textContent = await window.BHMQr.dekripsi(payload, pinCek.value); }
            catch (e) { hasilCek.textContent = 'PIN salah atau data rusak.'; }
          });
          cekWadah.appendChild(pinCek); cekWadah.appendChild(tombolCek); cekWadah.appendChild(hasilCek);
          k.appendChild(cekWadah);
        } catch (e) {
          toast(e.message);
        }
      });
      return k;
    }
  });

  // ---------- Fase 27: Simulasi interogasi ----------
  daftar({
    id: 'simulasi', ikon: '🎭', judul: 'Simulasi Interogasi',
    ringkas: 'Latihan mental menghadapi pertanyaan tegas ala pemeriksaan',
    render() {
      const k = kartuAlat('🎭 Simulasi Interogasi', 'Latihan menjawab pertanyaan galak sebelum pemeriksaan sungguhan. Ini skrip latihan berbasis aturan di HP-mu, bukan AI.');
      const area = buat('div', 'mt-3');
      k.appendChild(area);
      const mulai = buat('button', KELAS_TOMBOL + ' mt-3 w-full', 'Mulai Sesi Latihan');
      mulai.type = 'button';
      k.appendChild(mulai);

      mulai.addEventListener('click', () => {
        mulai.classList.add('hidden');
        const sesi = window.BHMSimulasi.buatSesi();
        area.innerHTML = '';

        function tampilPertanyaan() {
          const q = sesi.berikutnya();
          area.innerHTML = '';
          if (!q) {
            const selesai = buat('div', 'animasi-muncul rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4');
            selesai.appendChild(buat('p', 'text-sm font-bold text-emerald-300', '✔ Sesi selesai.'));
            selesai.appendChild(buat('p', 'mt-1 text-sm text-slate-300', 'Kamu sudah berlatih menghadapi tekanan. Ingat: jawab sesuai yang kamu alami, minta didampingi penasihat hukum, dan baca BAP sebelum tanda tangan.'));
            area.appendChild(selesai);
            mulai.classList.remove('hidden');
            mulai.textContent = 'Ulangi Latihan';
            return;
          }
          const kartu2 = buat('div', 'animasi-muncul rounded-xl border border-slate-700 bg-slate-900/60 p-4');
          kartu2.appendChild(buat('p', 'text-[11px] font-bold uppercase tracking-wide text-slate-500', 'Pemeriksa • pertanyaan ' + q.nomor + '/' + q.total));
          kartu2.appendChild(buat('p', 'mt-1 text-sm font-bold leading-relaxed text-white', q.tanya));
          const jawab = buat('textarea', KELAS_INPUT + ' mt-3'); jawab.rows = 3; jawab.placeholder = 'Tulis jawabanmu di sini sebagai latihan...';
          const tombolJawab = buat('button', KELAS_TOMBOL2 + ' mt-2 w-full', 'Jawab');
          tombolJawab.type = 'button';
          const tips = buat('p', 'mt-2 hidden rounded-lg bg-indigo-500/10 p-2.5 text-xs leading-relaxed text-indigo-200', '💡 ' + q.tips);
          tombolJawab.addEventListener('click', () => {
            if (jawab.value.trim().length < 3) { toast('Coba jawab dulu, anggap ini pemeriksaan beneran.'); return; }
            tips.classList.remove('hidden');
            tombolJawab.textContent = 'Pertanyaan Berikutnya →';
            tombolJawab.onclick = null;
            tombolJawab.addEventListener('click', tampilPertanyaan, { once: true });
          }, { once: true });
          kartu2.appendChild(jawab); kartu2.appendChild(tombolJawab); kartu2.appendChild(tips);
          area.appendChild(kartu2);
        }
        tampilPertanyaan();
      });
      return k;
    }
  });

  // ---------- Fase 28: Jaringan darurat P2P ----------
  daftar({
    id: 'p2p', ikon: '📡', judul: 'Jaringan Darurat P2P',
    ringkas: 'Kirim ringkasan kasus langsung ke HP lain, tanpa server',
    render() {
      const k = kartuAlat('📡 Jaringan Darurat P2P', 'Sambungan langsung antar dua HP (WebRTC). Kode sambungan disalin manual lewat chat apa pun; setelah tersambung, data tidak lewat server. Butuh jaringan lokal atau internet untuk proses sambungan awal.');
      const status = buat('p', 'mt-3 text-xs font-semibold text-slate-400', 'Status: belum tersambung');
      const log = buat('div', 'mt-3 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-300');
      log.appendChild(buat('p', 'text-slate-500', 'Pesan akan muncul di sini.'));

      const bagianBuat = buat('div', 'mt-3 rounded-xl border border-slate-700 p-3');
      bagianBuat.appendChild(buat('p', 'text-sm font-bold text-white', 'HP 1 — yang memulai'));
      const tombolBuat = buat('button', KELAS_TOMBOL2 + ' mt-2 w-full', '1. Buat Kode Tawaran');
      tombolBuat.type = 'button';
      const kodeTawaran = buat('textarea', KELAS_INPUT + ' mt-2'); kodeTawaran.rows = 2; kodeTawaran.readOnly = true; kodeTawaran.placeholder = 'Kode tawaran muncul di sini — salin dan kirim ke HP 2';
      const tempelJawaban = buat('textarea', KELAS_INPUT + ' mt-2'); tempelJawaban.rows = 2; tempelJawaban.placeholder = '3. Tempel kode jawaban dari HP 2 di sini';
      const tombolSambung = buat('button', KELAS_TOMBOL2 + ' mt-2 w-full', 'Sambungkan');
      tombolSambung.type = 'button';
      bagianBuat.appendChild(tombolBuat); bagianBuat.appendChild(kodeTawaran); bagianBuat.appendChild(tempelJawaban); bagianBuat.appendChild(tombolSambung);

      const bagianTerima = buat('div', 'mt-3 rounded-xl border border-slate-700 p-3');
      bagianTerima.appendChild(buat('p', 'text-sm font-bold text-white', 'HP 2 — yang menerima'));
      const tempelTawaran = buat('textarea', KELAS_INPUT + ' mt-2'); tempelTawaran.rows = 2; tempelTawaran.placeholder = 'Tempel kode tawaran dari HP 1 di sini';
      const tombolTerima = buat('button', KELAS_TOMBOL2 + ' mt-2 w-full', '2. Buat Kode Jawaban');
      tombolTerima.type = 'button';
      const kodeJawaban = buat('textarea', KELAS_INPUT + ' mt-2'); kodeJawaban.rows = 2; kodeJawaban.readOnly = true; kodeJawaban.placeholder = 'Kode jawaban muncul di sini — kirim balik ke HP 1';
      bagianTerima.appendChild(tempelTawaran); bagianTerima.appendChild(tombolTerima); bagianTerima.appendChild(kodeJawaban);

      const bagianKirim = buat('div', 'mt-3 rounded-xl border border-slate-700 p-3');
      bagianKirim.appendChild(buat('p', 'text-sm font-bold text-white', 'Kirim data'));
      const isiPesan = buat('textarea', KELAS_INPUT + ' mt-2'); isiPesan.rows = 2; isiPesan.placeholder = 'Ringkasan kasus atau pesan darurat...';
      const barisTombol = buat('div', 'mt-2 flex gap-2');
      const tombolKirim = buat('button', KELAS_TOMBOL + ' flex-1', 'Kirim');
      tombolKirim.type = 'button';
      const tombolIsiAnalisis = buat('button', KELAS_TOMBOL2 + ' flex-1', 'Isi dari Analisis Terakhir');
      tombolIsiAnalisis.type = 'button';
      barisTombol.appendChild(tombolKirim); barisTombol.appendChild(tombolIsiAnalisis);
      bagianKirim.appendChild(isiPesan); bagianKirim.appendChild(barisTombol);

      k.appendChild(status); k.appendChild(bagianBuat); k.appendChild(bagianTerima); k.appendChild(bagianKirim); k.appendChild(log);

      function catat(teks) { log.appendChild(buat('p', '', teks)); log.scrollTop = log.scrollHeight; }
      function setStatus(s) { status.textContent = 'Status: ' + s; }

      const onPesan = (data) => catat('📩 Masuk: ' + data);
      tombolBuat.addEventListener('click', async () => {
        try { kodeTawaran.value = await window.BHMP2p.buatTawaran(setStatus, onPesan); catat('Kode tawaran dibuat. Kirim ke HP 2.'); }
        catch (e) { toast('Gagal: ' + e.message); }
      });
      tombolTerima.addEventListener('click', async () => {
        try { kodeJawaban.value = await window.BHMP2p.terimaTawaran(tempelTawaran.value.trim(), setStatus, onPesan); catat('Kode jawaban dibuat. Kirim balik ke HP 1.'); }
        catch (e) { toast('Kode tawaran tidak valid.'); }
      });
      tombolSambung.addEventListener('click', async () => {
        try { await window.BHMP2p.terimaJawaban(tempelJawaban.value.trim()); catat('Menyambungkan...'); }
        catch (e) { toast(e.message); }
      });
      tombolIsiAnalisis.addEventListener('click', () => {
        const a = baca('bhm_analisis_terakhir', null);
        isiPesan.value = a && a.pasal ? (a.kategori + ' — ' + a.pasal + '. Cerita: ' + a.cerita) : (a ? a.cerita : '');
        if (!isiPesan.value) toast('Belum ada analisis tersimpan.');
      });
      tombolKirim.addEventListener('click', () => {
        try { window.BHMP2p.kirim(isiPesan.value.trim()); catat('📤 Terkirim: ' + isiPesan.value.trim()); isiPesan.value = ''; }
        catch (e) { toast(e.message); }
      });
      return k;
    }
  });

  // ---------- Fase 33: Peta panas kejahatan (data laporan mandiri lokal) ----------
  daftar({
    id: 'heatmap', ikon: '🗺️', judul: 'Peta Panas Kejahatan',
    ringkas: 'Catat & lihat nomor/daerah yang sering kamu laporkan',
    render() {
      const k = kartuAlat('🗺️ Peta Panas (Laporan Mandiri)', 'Catat nomor/akun penipu dan daerahnya. Grafik batang menunjukkan yang paling sering kamu laporkan. Jujur soal batasan: tanpa server, ini data laporanmu sendiri di HP ini — bukan peta nasional dan tanpa gambar peta (butuh internet).');
      const jenis = buat('select', KELAS_INPUT + ' mt-3');
      ['Penipuan online', 'Telepon/WA penipuan', 'Debt collector ilegal', 'Lainnya'].forEach((j) => {
        const o = buat('option', '', j); jenis.appendChild(o);
      });
      const nomor = buat('input', KELAS_INPUT + ' mt-2'); nomor.placeholder = 'Nomor HP / akun pelaku';
      const daerah = buat('input', KELAS_INPUT + ' mt-2'); daerah.placeholder = 'Daerah kejadian, cth: Purbalingga';
      const tombol = buat('button', KELAS_TOMBOL + ' mt-2 w-full', 'Catat Laporan');
      tombol.type = 'button';
      const grafik = buat('div', 'mt-4');
      k.appendChild(jenis); k.appendChild(nomor); k.appendChild(daerah); k.appendChild(tombol); k.appendChild(grafik);

      function gambar() {
        const laporan = baca('bhm_heatmap', []);
        grafik.innerHTML = '';
        grafik.appendChild(buat('p', 'text-xs font-bold uppercase tracking-wide text-slate-400', laporan.length + ' laporan tercatat'));
        // Hitung per daerah.
        const perDaerah = {};
        for (const l of laporan) perDaerah[l.daerah] = (perDaerah[l.daerah] || 0) + 1;
        const maks = Math.max(1, ...Object.values(perDaerah));
        for (const [nama, jumlah] of Object.entries(perDaerah).sort((a, b) => b[1] - a[1])) {
          const baris = buat('div', 'mt-2');
          baris.appendChild(buat('p', 'text-xs text-slate-300', nama + ' (' + jumlah + ')'));
          const batang = buat('div', 'mt-0.5 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-rose-500');
          batang.style.width = Math.round((jumlah / maks) * 100) + '%';
          baris.appendChild(batang);
          grafik.appendChild(baris);
        }
        // Daftar laporan terbaru.
        const ul = buat('ul', 'mt-3 space-y-1.5');
        laporan.slice(0, 20).forEach((l) => {
          const item = buat('li', 'flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 text-xs');
          item.appendChild(buat('span', 'min-w-0 truncate text-slate-300', l.jenis + ' • ' + l.nomor + ' • ' + l.daerah));
          const hapus = buat('button', 'shrink-0 text-rose-400', '✕');
          hapus.type = 'button';
          hapus.addEventListener('click', () => { simpan('bhm_heatmap', laporan.filter((x) => x.id !== l.id)); gambar(); });
          item.appendChild(hapus);
          ul.appendChild(item);
        });
        grafik.appendChild(ul);
      }

      tombol.addEventListener('click', () => {
        if (!nomor.value.trim() || !daerah.value.trim()) { toast('Isi nomor/akun dan daerahnya.'); return; }
        const laporan = baca('bhm_heatmap', []);
        laporan.unshift({ id: 'h' + Date.now(), jenis: jenis.value, nomor: nomor.value.trim(), daerah: daerah.value.trim() });
        simpan('bhm_heatmap', laporan);
        nomor.value = ''; daerah.value = '';
        gambar();
      });
      gambar();
      return k;
    }
  });
})();
