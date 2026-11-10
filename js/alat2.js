/* ===== Alat BHM (bagian 2): kalkulator waktu, tracker, denda OJK, negosiator,
   detektor gaslighting, detektor skip tracing ===== */
(function () {
  'use strict';

  const { daftar, kartuAlat, KELAS_INPUT, KELAS_TOMBOL, KELAS_TOMBOL2 } = window.BHMAlat;
  const { buat, toast, simpan, baca, formatWaktu } = window.BHM;

  // ---------- Fase 18: Kalkulator waktu / pengingat deadline ----------
  daftar({
    id: 'waktu', ikon: '⏳', judul: 'Kalkulator Waktu',
    ringkas: 'Hitung deadline hukum & pasang pengingat lokal di HP',
    render() {
      const k = kartuAlat('⏳ Kalkulator Waktu & Pengingat', 'Hitung tanggal deadline, lalu pasang pengingat. Jujur soal batasan: tanpa server, pengingat bunyi saat aplikasi dibuka (bukan push dari luar); izinkan notifikasi agar muncul sebagai pemberitahuan HP.');
      const grid = buat('div', 'mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3');
      const tgl = buat('input', KELAS_INPUT); tgl.type = 'date';
      const hari = buat('input', KELAS_INPUT); hari.type = 'number'; hari.min = '1'; hari.placeholder = 'Jumlah hari, cth: 14';
      const label = buat('input', KELAS_INPUT); label.placeholder = 'Nama deadline, cth: lapor Disnaker';
      grid.appendChild(tgl); grid.appendChild(hari); grid.appendChild(label);
      k.appendChild(grid);
      const tombol = buat('button', KELAS_TOMBOL + ' mt-3 w-full', 'Simpan Pengingat');
      tombol.type = 'button';
      k.appendChild(tombol);
      const daftarDiv = buat('div', 'mt-3 space-y-2');
      k.appendChild(daftarDiv);

      function gambar() {
        const daftarP = baca('bhm_pengingat', []);
        daftarDiv.innerHTML = '';
        const sekarang = Date.now();
        for (const p of daftarP) {
          const sisa = Math.ceil((new Date(p.deadline).getTime() - sekarang) / 86400000);
          const item = buat('div', 'flex items-center justify-between gap-2 rounded-xl border p-3 ' +
            (sisa < 0 ? 'border-rose-500/50 bg-rose-500/10' : sisa <= 3 ? 'border-amber-500/50 bg-amber-500/10' : 'border-slate-700 bg-slate-900/60'));
          const info = buat('div', 'min-w-0');
          info.appendChild(buat('p', 'truncate text-sm font-bold text-white', p.label));
          info.appendChild(buat('p', 'text-[11px] text-slate-400', 'Deadline: ' + new Date(p.deadline).toLocaleDateString('id-ID', { dateStyle: 'long' })));
          item.appendChild(info);
          const kanan = buat('div', 'flex shrink-0 items-center gap-2');
          kanan.appendChild(buat('span', 'text-xs font-bold ' + (sisa < 0 ? 'text-rose-300' : sisa <= 3 ? 'text-amber-300' : 'text-emerald-300'),
            sisa < 0 ? 'LEWAT ' + Math.abs(sisa) + ' hari' : sisa + ' hari lagi'));
          const hapus = buat('button', 'rounded-lg border border-slate-600 px-2 py-1 text-[11px] text-slate-400', 'Hapus');
          hapus.type = 'button';
          hapus.addEventListener('click', () => {
            simpan('bhm_pengingat', baca('bhm_pengingat', []).filter((x) => x.id !== p.id));
            gambar();
          });
          kanan.appendChild(hapus);
          item.appendChild(kanan);
          daftarDiv.appendChild(item);
        }
        if (daftarP.length === 0) daftarDiv.appendChild(buat('p', 'text-sm text-slate-500', 'Belum ada pengingat.'));
      }

      tombol.addEventListener('click', async () => {
        if (!tgl.value || !hari.value || !label.value.trim()) { toast('Isi tanggal mulai, jumlah hari, dan nama deadline.'); return; }
        const deadline = new Date(tgl.value + 'T00:00:00');
        deadline.setDate(deadline.getDate() + Number(hari.value));
        const daftarP = baca('bhm_pengingat', []);
        daftarP.unshift({ id: 'p' + Date.now(), label: label.value.trim(), mulai: tgl.value, hari: Number(hari.value), deadline: deadline.toISOString() });
        simpan('bhm_pengingat', daftarP);
        // Minta izin notifikasi bila belum; pengingat diperiksa tiap aplikasi dibuka.
        if ('Notification' in window && Notification.permission === 'default') {
          try { await Notification.requestPermission(); } catch (e) {}
        }
        toast('Pengingat tersimpan di HP ini.');
        gambar();
      });

      // Saat alat dibuka, tampilkan notifikasi untuk deadline <= 3 hari.
      const daftarP = baca('bhm_pengingat', []);
      const dekat = daftarP.filter((p) => (new Date(p.deadline).getTime() - Date.now()) / 86400000 <= 3);
      if (dekat.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('BHM: deadline dekat', { body: dekat.map((p) => p.label).join(', ') });
      }
      gambar();
      return k;
    }
  });

  // ---------- Fase 19: Dasbor pelacak (kanban lokal) ----------
  const KOLOM = ['Baru', 'Bukti terkumpul', 'Somasi terkirim', 'Laporan polisi', 'Selesai'];
  daftar({
    id: 'tracker', ikon: '📋', judul: 'Dasbor Pelacak',
    ringkas: 'Papan kanban lokal untuk memantau status perkaramu',
    render() {
      const k = kartuAlat('📋 Dasbor Pelacak Perkara', 'Catat tiap perkara dan geser statusnya. Semua tersimpan di HP kamu.');
      const input = buat('input', KELAS_INPUT + ' mt-3'); input.placeholder = 'Nama perkara baru, cth: Penipuan toko online X';
      const tombol = buat('button', KELAS_TOMBOL + ' mt-2 w-full', 'Tambah Perkara');
      tombol.type = 'button';
      const papan = buat('div', 'mt-4 space-y-3');
      k.appendChild(input); k.appendChild(tombol); k.appendChild(papan);

      function gambar() {
        const kartu = baca('bhm_tracker', []);
        papan.innerHTML = '';
        KOLOM.forEach((namaKolom, idx) => {
          const isi = kartu.filter((c) => c.kolom === idx);
          const kolomDiv = buat('div', 'rounded-xl border border-slate-700 bg-slate-900/50 p-3');
          kolomDiv.appendChild(buat('p', 'text-xs font-bold uppercase tracking-wide text-slate-400', namaKolom + ' (' + isi.length + ')'));
          for (const c of isi) {
            const kartuDiv = buat('div', 'mt-2 rounded-lg border border-slate-600 bg-slate-800 p-2.5');
            kartuDiv.appendChild(buat('p', 'text-sm font-semibold text-white', c.judul));
            const aksi = buat('div', 'mt-1.5 flex gap-1.5');
            if (idx > 0) {
              const kiri = buat('button', 'rounded-md border border-slate-600 px-2 py-0.5 text-[11px] text-slate-300', '← mundur');
              kiri.type = 'button';
              kiri.addEventListener('click', () => { c.kolom -= 1; simpan('bhm_tracker', kartu); gambar(); });
              aksi.appendChild(kiri);
            }
            if (idx < KOLOM.length - 1) {
              const kanan = buat('button', 'rounded-md bg-indigo-500/20 border border-indigo-500/50 px-2 py-0.5 text-[11px] font-semibold text-indigo-200', 'maju →');
              kanan.type = 'button';
              kanan.addEventListener('click', () => { c.kolom += 1; simpan('bhm_tracker', kartu); gambar(); });
              aksi.appendChild(kanan);
            }
            const hapus = buat('button', 'rounded-md border border-slate-600 px-2 py-0.5 text-[11px] text-slate-400', 'hapus');
            hapus.type = 'button';
            hapus.addEventListener('click', () => { simpan('bhm_tracker', kartu.filter((x) => x.id !== c.id)); gambar(); });
            aksi.appendChild(hapus);
            kartuDiv.appendChild(aksi);
            kolomDiv.appendChild(kartuDiv);
          }
          papan.appendChild(kolomDiv);
        });
      }

      tombol.addEventListener('click', () => {
        if (!input.value.trim()) { toast('Isi nama perkara dulu.'); return; }
        const kartu = baca('bhm_tracker', []);
        kartu.unshift({ id: 't' + Date.now(), judul: input.value.trim(), kolom: 0 });
        simpan('bhm_tracker', kartu);
        input.value = '';
        gambar();
      });
      gambar();
      return k;
    }
  });

  // ---------- Fase 34: Kalkulator denda pinjol (SEOJK 19/2025) ----------
  daftar({
    id: 'denda', ikon: '🧮', judul: 'Kalkulator Denda Pinjol',
    ringkas: 'Hitung batas bunga+denda legal menurut aturan OJK terbaru',
    render() {
      const k = kartuAlat('🧮 Kalkulator Denda Pinjol', 'Cek apakah tagihan debt collector melebihi batas legal OJK (SEOJK 19/SEOJK.06/2025): bunga maks 0,3%/hari (tenor ≤6 bulan) atau 0,2%/hari (>6 bulan), dan total bunga+denda maksimal 100% pokok.');
      const grid = buat('div', 'mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2');
      const pokok = buat('input', KELAS_INPUT); pokok.type = 'number'; pokok.placeholder = 'Pokok pinjaman (Rp), cth: 1000000';
      const hari = buat('input', KELAS_INPUT); hari.type = 'number'; hari.placeholder = 'Hari berjalan / telat, cth: 30';
      const tenor = buat('select', KELAS_INPUT);
      tenor.innerHTML = '';
      [['0.3', 'Tenor sampai 6 bulan (0,3%/hari)'], ['0.2', 'Tenor di atas 6 bulan (0,2%/hari)']].forEach(([v, t]) => {
        const o = buat('option', '', t); o.value = v; tenor.appendChild(o);
      });
      const tagihan = buat('input', KELAS_INPUT); tagihan.type = 'number'; tagihan.placeholder = 'Total yang ditagih DC (Rp)';
      grid.appendChild(pokok); grid.appendChild(hari); grid.appendChild(tenor); grid.appendChild(tagihan);
      k.appendChild(grid);
      const tombol = buat('button', KELAS_TOMBOL + ' mt-3 w-full', 'Hitung Batas Legal');
      tombol.type = 'button';
      k.appendChild(tombol);
      const hasil = buat('div', 'mt-3 hidden');
      k.appendChild(hasil);
      const rupiah = (n) => 'Rp' + Math.round(n).toLocaleString('id-ID');

      tombol.addEventListener('click', () => {
        const p = Number(pokok.value), h = Number(hari.value), r = Number(tenor.value), t = Number(tagihan.value);
        if (!p || !h) { toast('Isi pokok pinjaman dan jumlah hari.'); return; }
        const bungaMaks = Math.min(p * (r / 100) * h, p); // total manfaat ekonomi+denda ≤ 100% pokok
        const totalMaks = p + bungaMaks;
        hasil.innerHTML = '';
        hasil.classList.remove('hidden');
        const kartu2 = buat('div', 'animasi-muncul rounded-xl border border-slate-700 bg-slate-900/60 p-4');
        kartu2.appendChild(buat('p', 'text-sm text-slate-300', 'Bunga+denda maksimal legal: ' + rupiah(bungaMaks)));
        kartu2.appendChild(buat('p', 'mt-1 text-sm font-bold text-white', 'Total tagihan maksimal legal: ' + rupiah(totalMaks)));
        if (t > 0) {
          kartu2.appendChild(buat('p', 'mt-2 text-sm font-bold ' + (t > totalMaks ? 'text-rose-300' : 'text-emerald-300'),
            t > totalMaks
              ? '⚠️ Tagihan DC (' + rupiah(t) + ') MELEBIHI batas legal sebesar ' + rupiah(t - totalMaks) + '. Kamu berhak menolak sisanya dan bisa mengadu ke OJK 157.'
              : '✔ Tagihan DC (' + rupiah(t) + ') masih dalam batas legal.'));
        }
        kartu2.appendChild(buat('p', 'mt-2 text-[11px] text-slate-500', 'Aturan untuk pinjol berizin OJK. Pinjol ilegal tidak berhak menagih sama sekali — cek statusnya di situs OJK.'));
        hasil.appendChild(kartu2);
      });
      return k;
    }
  });

  // ---------- Fase 32: AI Negosiator damai (berbasis templat lokal) ----------
  daftar({
    id: 'negosiator', ikon: '🤝', judul: 'Negosiator Damai',
    ringkas: 'Susun pesan damai yang sopan untuk dikirim ke pihak lawan',
    render() {
      const k = kartuAlat('🤝 Negosiator Damai', 'Menyusun draf pesan mediasi yang tenang dan sopan dari pilihanmu. Ini templat aturan tetap di HP, bukan AI sungguhan.');
      const lawan = buat('input', KELAS_INPUT + ' mt-3'); lawan.placeholder = 'Nama pihak lawan, cth: Toko Berkah Online';
      const masalah = buat('input', KELAS_INPUT + ' mt-2'); masalah.placeholder = 'Pokok masalah, cth: barang belum dikirim sejak 2 minggu lalu';
      const keinginan = buat('input', KELAS_INPUT + ' mt-2'); keinginan.placeholder = 'Yang kamu inginkan, cth: barang dikirim atau uang kembali';
      const tombol = buat('button', KELAS_TOMBOL2 + ' mt-3 w-full', 'Susun Pesan Damai');
      tombol.type = 'button';
      const hasil = buat('div', 'mt-3 hidden');
      k.appendChild(lawan); k.appendChild(masalah); k.appendChild(keinginan); k.appendChild(tombol); k.appendChild(hasil);

      tombol.addEventListener('click', () => {
        if (!lawan.value.trim() || !masalah.value.trim() || !keinginan.value.trim()) { toast('Lengkapi ketiga kolom dulu.'); return; }
        const pesan =
          'Selamat siang Bapak/Ibu ' + lawan.value.trim() + '.\n\n' +
          'Saya menghubungi dengan niat baik untuk menyelesaikan persoalan kita secara kekeluargaan. ' +
          'Permasalahannya: ' + masalah.value.trim() + '.\n\n' +
          'Harapan saya sederhana: ' + keinginan.value.trim() + '. ' +
          'Saya yakin kita bisa menyelesaikannya tanpa perlu melibatkan pihak lain. ' +
          'Bila dalam 7 hari tidak ada penyelesaian, dengan berat hati saya akan menempuh jalur resmi sesuai hak saya.\n\n' +
          'Terima kasih atas perhatian dan itikad baiknya.';
        hasil.innerHTML = '';
        hasil.classList.remove('hidden');
        const kotak = buat('div', 'animasi-muncul rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4');
        kotak.appendChild(buat('p', 'whitespace-pre-wrap text-sm leading-relaxed text-slate-200', pesan));
        const salin = buat('button', KELAS_TOMBOL + ' mt-3 w-full', 'Salin Pesan');
        salin.type = 'button';
        salin.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(pesan); window.BHM.toastNotif('Teks berhasil disalin!'); }
          catch (e) { toast('Gagal menyalin; blok teksnya lalu salin manual.'); }
        });
        kotak.appendChild(salin);
        hasil.appendChild(kotak);
      });
      return k;
    }
  });

  // ---------- Fase 29: Detektor gaslighting ----------
  const POLA_GAS = [
    { pola: /kamu yang (salah|mulai)/i, label: 'Memutarbalikkan kesalahan ke kamu' },
    { pola: /gak ada yang percaya|tidak ada yang percaya|siapa yang percaya/i, label: 'Membuatmu merasa tidak akan dipercaya' },
    { pola: /(saya|aku) sebar|akan (saya|aku) sebar|sebarkan/i, label: 'Ancaman menyebarkan sesuatu (pemerasan)' },
    { pola: /kalau (kamu|lu) lapor/i, label: 'Ancaman bila melapor' },
    { pola: /itu cuma bercanda|terlalu sensitif|baper/i, label: 'Mengecilkan perasaanmu' },
    { pola: /kamu gila|gila kamu|sakit jiwa/i, label: 'Menyerang kewarasanmu' },
    { pola: /(bayar|transfer) sekarang atau/i, label: 'Tekanan waktu untuk membayar' },
    { pola: /(datang|datangi) ke (rumah|kantor|tempat kerja)/i, label: 'Ancaman mendatangi (intimidasi DC)' },
    { pola: /semua (kontak|teman|keluarga) (kamu|lu)/i, label: 'Ancaman menghubungi orang-orangmu' }
  ];
  daftar({
    id: 'gaslighting', ikon: '🧠', judul: 'Detektor Gaslighting',
    ringkas: 'Deteksi pola ancaman & intimidasi psikologis di pesan penagih/bos',
    render() {
      const k = kartuAlat('🧠 Detektor Gaslighting', 'Tempel pesan dari penagih utang, bos, atau siapa pun yang bikin kamu tidak nyaman. Aturan deteksi berjalan lokal; bukan diagnosis, tapi bantu kamu sadar pola.');
      const input = buat('textarea', KELAS_INPUT + ' mt-3'); input.rows = 4; input.placeholder = 'Tempel isi pesannya di sini...';
      const tombol = buat('button', KELAS_TOMBOL + ' mt-2 w-full', 'Periksa Pola');
      tombol.type = 'button';
      const hasil = buat('div', 'mt-3 hidden');
      k.appendChild(input); k.appendChild(tombol); k.appendChild(hasil);

      tombol.addEventListener('click', () => {
        const teks = input.value.trim();
        if (teks.length < 10) { toast('Tempel dulu isi pesannya.'); return; }
        const temuan = POLA_GAS.filter((p) => p.pola.test(teks));
        hasil.innerHTML = '';
        hasil.classList.remove('hidden');
        const kartu2 = buat('div', 'animasi-muncul rounded-xl border p-4 ' + (temuan.length ? 'border-rose-500/40 bg-rose-500/5' : 'border-emerald-500/40 bg-emerald-500/5'));
        if (temuan.length === 0) {
          kartu2.appendChild(buat('p', 'text-sm font-bold text-emerald-300', '✔ Tidak ada pola intimidasi yang terdeteksi.'));
          kartu2.appendChild(buat('p', 'mt-1 text-xs text-slate-400', 'Bukan jaminan aman — detektor ini berbasis daftar pola, bukan AI.'));
        } else {
          kartu2.appendChild(buat('p', 'text-sm font-bold text-rose-300', '⚠️ Terdeteksi ' + temuan.length + ' pola intimidasi/manipulasi:'));
          const ul = buat('ul', 'mt-2 list-disc pl-5 text-sm text-slate-200');
          for (const t of temuan) ul.appendChild(buat('li', '', t.label));
          kartu2.appendChild(ul);
          kartu2.appendChild(buat('p', 'mt-2 text-xs leading-relaxed text-slate-400',
            'Jangan merasa bersalah. Simpan pesannya sebagai bukti (kunci di Brankas Bukti), dan pertimbangkan lapor bila ada ancaman — ancaman kekerasan lewat chat bisa dipidana (Pasal 29 UU ITE).'));
        }
        hasil.appendChild(kartu2);
      });
      return k;
    }
  });

  // ---------- Fase 31: Detektor skip tracing (tautan pelacak) ----------
  const PELACAK = ['grabify', 'iplogger', 'blasze', '2no.co', 'yip.su', 'iplis.ru', 'maper.info', 'traklink', 'spylink'];
  const SHORTENER = ['bit.ly', 'tinyurl', 's.id', 't.co', 'goo.gl', 'shorturl', 'cutt.ly', 'rebrand.ly'];
  daftar({
    id: 'skiptrace', ikon: '🕵️', judul: 'Detektor Tautan Pelacak',
    ringkas: 'Periksa link mencurigakan sebelum diklik — tanpa membukanya',
    render() {
      const k = kartuAlat('🕵️ Detektor Tautan Pelacak', 'Tempel link yang mencurigakan. Aplikasi membedah strukturnya di HP ini — link TIDAK dibuka, jadi pelacak tidak sempat bekerja.');
      const input = buat('input', KELAS_INPUT + ' mt-3'); input.placeholder = 'https://...';
      const tombol = buat('button', KELAS_TOMBOL + ' mt-2 w-full', 'Periksa Tautan');
      tombol.type = 'button';
      const hasil = buat('div', 'mt-3 hidden');
      k.appendChild(input); k.appendChild(tombol); k.appendChild(hasil);

      tombol.addEventListener('click', () => {
        const mentah = input.value.trim();
        let url;
        try { url = new URL(mentah.startsWith('http') ? mentah : 'https://' + mentah); }
        catch (e) { toast('Itu bukan tautan yang valid.'); return; }
        const temuan = [];
        const host = url.hostname.toLowerCase();
        if (PELACAK.some((p) => host.includes(p))) temuan.push('Domain dikenal sebagai layanan pelacak IP (IP logger).');
        if (SHORTENER.some((p) => host === p || host.endsWith('.' + p))) temuan.push('Tautan pendek: tujuan asli disembunyikan.');
        if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) temuan.push('Memakai alamat IP mentah, bukan nama domain.');
        if (url.username) temuan.push('Ada jebakan "@" — domain asli bisa berbeda dari yang terlihat.');
        if (host.split('.').length > 3) temuan.push('Subdomain berlapis, pola umum phishing.');
        const paramLacak = [];
        url.searchParams.forEach((_, kunci) => {
          if (/^(utm_|fbclid|gclid|igshid|ref_|track)/i.test(kunci)) paramLacak.push(kunci);
        });
        if (paramLacak.length > 0) temuan.push('Parameter pelacak: ' + paramLacak.join(', '));

        hasil.innerHTML = '';
        hasil.classList.remove('hidden');
        const kartu2 = buat('div', 'animasi-muncul rounded-xl border p-4 ' + (temuan.length ? 'border-amber-500/40 bg-amber-500/5' : 'border-emerald-500/40 bg-emerald-500/5'));
        kartu2.appendChild(buat('p', 'text-sm font-bold ' + (temuan.length ? 'text-amber-300' : 'text-emerald-300'),
          temuan.length ? '⚠️ ' + temuan.length + ' tanda mencurigakan:' : '✔ Tidak ada tanda pelacak yang dikenali.'));
        for (const t of temuan) kartu2.appendChild(buat('p', 'mt-1 text-sm text-slate-200', '• ' + t));
        if (paramLacak.length > 0) {
          const bersih = new URL(url.href);
          paramLacak.forEach((p) => bersih.searchParams.delete(p));
          const baris = buat('div', 'mt-2 flex items-center gap-2');
          const teksBersih = buat('p', 'min-w-0 flex-1 truncate rounded-lg bg-slate-900 px-2 py-1.5 text-xs text-emerald-200', bersih.href);
          const salin = buat('button', 'shrink-0 rounded-lg border border-slate-600 px-2 py-1.5 text-xs font-semibold text-slate-300', 'Salin');
          salin.type = 'button';
          salin.addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(bersih.href); window.BHM.toastNotif('Teks berhasil disalin!'); }
            catch (e) { toast('Gagal menyalin.'); }
          });
          baris.appendChild(teksBersih); baris.appendChild(salin);
          kartu2.appendChild(baris);
        }
        kartu2.appendChild(buat('p', 'mt-2 text-[11px] text-slate-500', 'Deteksi berbasis daftar pola lokal; tautan tidak dibuka. Tetap waspada walau hasilnya bersih.'));
        hasil.appendChild(kartu2);
      });
      return k;
    }
  });
})();
