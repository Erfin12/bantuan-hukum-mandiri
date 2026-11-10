BANTUAN HUKUM MANDIRI (BHM) v6.4 - kredit hak cipta Erfin
============================================

PEMBARUAN v6.4
--------------
Versi ini mempertahankan seluruh fitur v6.3 dan menambahkan kredit hak
cipta Erfin pada aplikasi/kode, LICENSE.txt, serta cache service worker
bhm-v6.4 agar pembaruan dikenali perangkat.

HAK CIPTA DAN LISENSI
---------------------
Copyright (c) 2026 Erfin. All rights reserved.
Kredit ini dicantumkan dalam aplikasi dan kode. Kode boleh dibuka dan
dibaca untuk ditinjau; penyalinan, perubahan, pembagian ulang, penjualan,
atau pengakuan sebagai pembuat/pemegang hak memerlukan izin tertulis.
Ketentuan lengkap ada di LICENSE.txt. Ini lisensi khusus proyek, bukan
lisensi open-source standar. Materi pihak ketiga mengikuti ketentuannya.


v6.2 menambahkan (atas permintaan pengguna):
- Kartu baru di Beranda: "Layanan Ini GRATIS - Jangan Mau Dimintai
  Uang". Empat layanan negara yang oleh undang-undang tidak boleh
  dipungut biaya, lengkap dengan dasar hukum yang bisa dibuka-tutup:
  (1) lapor/mengadu ke polisi (Pasal 14(1) l & 15(1) a UU 2/2002 jo.
  UU 5/2026; laporan polisi tidak tercantum dalam daftar PNBP PP
  76/2020), (2) bantuan hukum untuk yang tidak mampu (UU 16/2011),
  (3) advokat yang ditunjuk negara (Pasal 154-155 UU 20/2025),
  (4) dokumen kependudukan: KTP/KK/akta (Pasal 79A UU 24/2013).
- Kotak tarif RESMI layanan kepolisian (PP 76/2020): SIM C baru
  Rp100.000 / perpanjangan Rp75.000, SKCK Rp30.000, STNK roda 2
  Rp100.000 - biar pengguna tahu bedanya tarif sah dan pungli.
- 5 langkah bila diminta uang di luar aturan + tombol kanal lapor:
  LAPOR! SMS 1708 / lapor.go.id, KPK kws.kpk.go.id / 198, Polisi 110.
- Peringatan: pungli itu pidana (Pasal 12 huruf e UU 20/2001, ancaman
  penjara seumur hidup atau 4-20 tahun); "uang pelicin" bisa jadi suap.
- Mesin analisis kenal entri baru "pungli" (pasal pilihan kini 89):
  cerita seperti "polisi minta uang buat laporan" atau "lurah pungut
  biaya KTP" kini cocok ke Pasal 12 huruf e UU 20/2001 dengan saran
  langkah konkret.
- Kartu Laporan Polisi di menu Surat kini menegaskan: membuat laporan
  polisi tidak dipungut biaya.

v6.1 merapikan rujukan KUHAP ke UU 20/2025 (lihat
CATATAN-PERUBAHAN-v6.1.txt).

v5 menambahkan (atas permintaan pengguna):
- Penjelasan bahasa awam kini lengkap untuk SELURUH 624 pasal KUHP
  (UU No. 1 Tahun 2023), bukan hanya 168.
- Ratusan perbaikan data: residu OCR di bunyi pasal KUHP (rujukan silang
  dan nomor hukuman) dirapikan.
- Semua rujukan ketenagakerjaan diperbarui ke UU No. 27 Tahun 2026
  (Pelindungan Ketenagakerjaan, berlaku 28 Oktober 2026, mencabut
  UU 13/2003): PKWT maksimal 4 tahun, cuti bersama tak memotong cuti,
  dana cadangan pesangon, hak pekerja platform digital, PHK yang dilarang.
- Tambahan pasal lengkap (teks resmi + awam): UU 27/2026 pilihan dan
  KUHPerdata populer (1131, 1239, 1243, 1320, 1338, 1365, 1366, 1367,
  1457, 1548). Total 88 pasal pilihan.
- Polesan UI: gulir halus menyeluruh, animasi ringan tanpa flicker,
  gaya kaca pada elemen melayang, tetap hormati reduced-motion.
- Siap GitHub Pages: semua path relatif, tanpa build.

Aplikasi web 100% offline-first (PWA), zero-knowledge: tidak ada backend,
semua logika berjalan di browser, data tidak pernah dikirim ke server.

CARA MENJALANKAN
----------------
Aplikasi butuh disajikan lewat HTTP(S) — bukan dibuka langsung sebagai
berkas (file://) — agar PWA, service worker, dan fetch JSON berfungsi:

1. Termux / komputer: jalankan server statis di folder ini, misalnya
   `python3 -m http.server 8080` lalu buka http://localhost:8080
2. Hosting statis (Netlify, GitHub Pages, Cloudflare Pages, dsb):
   unggah seluruh isi folder ini apa adanya (index.html di level atas).
3. Setelah dibuka sekali dengan internet, semua fitur bekerja offline
   (kecuali stempel waktu OTS yang memang butuh internet saat men-cap).

STRUKTUR BERKAS
---------------
index.html        kerangka UI (Tailwind via CDN, dark mode slate-900/indigo-500)
styles.css        animasi halus, anti-flicker, reduced-motion
manifest.json     PWA manifest (nama BHM, standalone)
sw.js             service worker (cache-first lokal+CDN, offline penuh)
icons/            ikon aplikasi
js/core.js        util bersama, navigasi, riwayat hash, kamuflase
js/app.js         analisis, brankas, surat, audio darurat
js/ai-engine.js   F3: pencocokan kata kunci ke pasal
js/hash.js        F4: brankas bukti WebCrypto SHA-256 + localStorage
js/pdf.js         F5: generator PDF somasi (jsPDF)
js/pdf2.js        F30 surat kuasa + F14 ekspor berkas
js/ots-rekam.js   F26: stempel waktu OpenTimestamps (online saat men-cap)
js/rekam.js       F35: rekam suara + kunci hash
js/ocr.js         F21: OCR Tesseract.js
js/qr.js          F25: QR darurat terenkripsi AES-GCM
js/p2p.js         F28: WebRTC sinyal manual antar-HP
js/simulasi.js    F27: skrip simulasi interogasi
js/suara.js       F13 audio darurat + F23 kendali suara
js/alat.js        grid alat + F16 kamus, F17 LBH, F24 bahasa, F22 kamuflase, F20 panic wipe
js/alat2.js       F18 kalkulator waktu, F19 tracker, F34 denda OJK, F32 negosiator, F29 gaslighting, F31 tautan pelacak
js/alat3.js       F21/F23/F25/F27/F28/F33 (UI alat)
js/mudah.js       v4: salin, favorit, riwayat, penjelasan awam, PDF hasil
data/awam.json    v5: 712 penjelasan bahasa sehari-hari (624 KUHP + 88 pilihan)
data/pasal.json   F1: 6 pasal (teks asli, KUHP baru + UU ITE 2024, rujukan lama F15)
data/kamus.json   F16: 50 istilah hukum
data/lbh.json     F17: kontak LBH 18 kota + darurat nasional
data/bahasa.json  F24: label UI + ringkasan pasal multi-bahasa

BATASAN JUJUR
-------------
- F18: pengingat hanya bunyi saat aplikasi dibuka (push server tidak ada).
- F21: OCR perlu internet sekali untuk mengunduh mesin+bahasa, lalu offline.
- F23: kendali suara butuh browser dengan Web Speech API (Chrome Android).
- F26: pengiriman hash ke OpenTimestamps butuh internet saat men-cap.
- F28: P2P butuh salin-tempel kode manual; data setelahnya langsung antar-HP.
- F33: peta panas adalah data laporan sendiri (tanpa server & tanpa peta).
- F35: browser tidak bisa merekam diam-diam di latar belakang; layar harus
  menyala dan halaman terbuka.
- Analisis hukum adalah pencocokan kata kunci, bukan AI dan bukan nasihat
  hukum. Aplikasi ini bukan pengacara. Konsultasi ke LBH.

DISCLAIMER: Aplikasi ini bukan pengacara. Konsultasi ke LBH.

EKSPANSI v0.2 (otak hukum)
--------------------------
- Database pasal diperluas dari 6 menjadi 88 entri (pasal pilihan yang paling
  sering menyentuh kehidupan sehari-hari: pidana umum KUHP 2023, ITE, PDP,
  ketenagakerjaan, konsumen, lalu lintas, keluarga, KDRT, TPKS, narkotika,
  tipikor, perlindungan anak, KUHAP, tanah, kepailitan, fidusia, hak cipta,
  TPPU, bea meterai, senjata tajam, dan KUHPerdata).
- Indeks 1.924 undang-undang (1945-2026) dengan tautan resmi JDIH BPK,
  bisa dijelajah offline lewat alat baru "Jelajah UU".
- Mesin v2: pencocokan kata kunci berbobot (frasa multi-kata bernilai lebih),
  perluasan sinonim bahasa sehari-hari ke istilah hukum, hasil menampilkan
  pasal utama + kemungkinan lain + UU terkait. Tetap jujur: bukan AI.
- Sumber teks pasal: dataset hasil ekstraksi dari peraturan resmi
  (peraturan.bpk.go.id) yang disunting manual dari gangguan OCR; setiap
  entri memuat tautan ke sumber resmi JDIH BPK. KUHPerdata memakai korpus
  JDIH Mahkamah Agung (alih aksara; bukan terjemahan resmi) dan diberi
  catatan kejujuran di aplikasi.

EKSPANSI v0.3 (KUHP 2023 lengkap)
---------------------------------
- Semua 624 pasal UU No. 1 Tahun 2023 (KUHP baru, berlaku 2 Januari 2026)
  masuk ke aplikasi sebagai data/kuhp.json: teks asli per pasal beserta
  nomor Buku dan Bab. Alat baru "KUHP 2023" untuk mencari dan membaca
  pasal (mis. "pasal 338" atau kata kunci seperti "narkoba"). Hasil
  analisis cerita kini juga menampilkan pasal KUHP yang mungkin terkait.
- Sumber: salinan resmi (LN.2023/No.1, TLN No.6842) diunduh dari
  peraturan.bpk.go.id pada 10 November 2026. Salinan resmi berupa pindaian;
  teks diekstrak dari tiga aliran OCR independen lalu dirujuk silang
  (voting kata per kata) dan diperiksa visual terhadap halaman pindaian
  pada titik-titik yang berbeda antar-aliran. Teks tidak diparafrase dan
  tidak diringkas.
- Kejujuran batas: walaupun sudah dirujuk silang tiga aliran + pemeriksaan
  visual pada ratusan titik sengketa, residu kesalahan OCR kecil (mis.
  satu huruf atau angka) masih mungkin tersisa pada sebagian kecil pasal.
  Untuk keperluan resmi/persidangan, selalu cocokkan dengan salinan resmi
  di tautan JDIH BPK.
