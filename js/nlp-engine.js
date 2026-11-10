/* ===== BHM v6: Mesin NLP offline (nlp-engine.js) =====
   Menyempurnakan fungsi analisisTeks(ceritaUser) agar lebih paham bahasa manusia:
   toleran typo, paham imbuhan, paham sinonim dan frasa. 100% Vanilla JS, tanpa server,
   tanpa pustaka luar, tanpa AI. Semua jalan lokal di HP.

   Empat tahap pengolahan:
     1. normalisasi(teks)            huruf kecil, buang tanda baca/emoji, angka -> teks
     2. stem(kata)                   pangkas imbuhan: dipukuli -> pukul, penipuan -> tipu
     3. levenshteinDistance(a, b)    toleransi typo (jarak edit maksimal 1-2 huruf)
     4. kamus sinonim + bigram       "main tangan" -> pukul, "bawa kabur" -> tipu

   Skor tiap kata kunci pasal (makin pasti makin tinggi):
     persis frasa 4 | persis kata 3 | satu akar kata (imbuhan beda) 2.5 | sinonim 1.8 | typo 1.6

   Letakkan file ini di folder js/, lalu muat SETELAH ai-engine.js dan SEBELUM app.js:
     <script defer src="js/ai-engine.js"></script>
     <script defer src="js/nlp-engine.js"></script>
   Fungsi BHMMesin.analisis (dipakai app.js) otomatis memakai mesin baru ini. */
(function () {
  'use strict';

  // ------------------------------------------------------------------
  // KONFIGURASI SKOR
  // ------------------------------------------------------------------
  const SKOR = { FRASA: 4, PERSIS: 3, AKAR: 2.5, SINONIM: 1.8, TYPO: 1.6 };
  const SKOR_MINIMAL = 2.6;   // pasal dengan bukti persis/akar harus mencapai ini
  const SKOR_MINIMAL_LUNAK = 1.5; // pasal yang cocok lewat sinonim/typo cukup 1.5

  // ------------------------------------------------------------------
  // TAHAP 1: NORMALISASI TEKS
  // ------------------------------------------------------------------
  const SATUAN = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];
  const BELASAN = ['sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas', 'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas'];

  /** Angka 0-999 menjadi kata: 17 -> "tujuh belas". Angka lebih besar dibiarkan. */
  function angkaKeTeks(n) {
    if (n < 10) return SATUAN[n];
    if (n < 20) return BELASAN[n - 10];
    if (n < 100) {
      const p = Math.floor(n / 10), s = n % 10;
      return SATUAN[p] + ' puluh' + (s ? ' ' + SATUAN[s] : '');
    }
    if (n < 1000) {
      const r = Math.floor(n / 100), sisa = n % 100;
      return (r === 1 ? 'seratus' : SATUAN[r] + ' ratus') + (sisa ? ' ' + angkaKeTeks(sisa) : '');
    }
    return String(n);
  }

  /** Ejaan percakapan umum -> bentuk baku. Hanya kata utuh. */
  const GAUL = {
    gk: 'tidak', ga: 'tidak', gak: 'tidak', nggak: 'tidak', ngga: 'tidak', enggak: 'tidak', tdk: 'tidak', tak: 'tidak',
    yg: 'yang', dgn: 'dengan', utk: 'untuk', krn: 'karena', karna: 'karena', sy: 'saya', aq: 'saya', gue: 'saya', gw: 'saya', aku: 'saya',
    udh: 'sudah', udah: 'sudah', sdh: 'sudah', blm: 'belum', belom: 'belum', jg: 'juga', sm: 'sama', dr: 'dari', dlm: 'dalam', pd: 'pada',
    bgt: 'sekali', banget: 'sekali', hrs: 'harus', bs: 'bisa', klo: 'kalau', kalo: 'kalau', kl: 'kalau', trs: 'terus', trus: 'terus',
    org: 'orang', hutang: 'utang', ngutang: 'utang', nipu: 'tipu', nipuin: 'tipu', ngancem: 'ancam', ngancam: 'ancam', mukulin: 'pukul',
    nabrak: 'tabrak', nyolong: 'curi', ngambil: 'ambil', nuduh: 'tuduh', ngatain: 'hina', ngehina: 'hina', ngeroyok: 'keroyok', mecat: 'pecat'
  };

  /**
   * TAHAP 1. Normalisasi: huruf kecil, buang aksen, tanda baca & emoji jadi spasi,
   * angka kecil jadi teks, ejaan gaul jadi baku. Hasilnya string tanpa spasi ganda.
   * @param {string} teks
   * @returns {string}
   */
  function normalisasi(teks) {
    let t = String(teks == null ? '' : teks).toLowerCase();
    t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');        // buang aksen: é -> e
    t = t.replace(/(\d)[.,](?=\d{3}\b)/g, '$1');                   // 7.500.000 -> 7500000
    t = t.replace(/[^a-z0-9\s]/g, ' ');                            // tanda baca, emoji, simbol -> spasi
    t = t.replace(/\b\d{1,3}\b/g, (m) => angkaKeTeks(Number(m)));  // 17 -> tujuh belas
    t = t.replace(/\s+/g, ' ').trim();
    return t.split(' ').map((w) => GAUL[w] || w).join(' ');
  }

  // ------------------------------------------------------------------
  // TAHAP 2: STEMMING BAHASA INDONESIA SEDERHANA
  // ------------------------------------------------------------------
  /* Daftar kata dasar (akar) yang sering muncul dalam cerita masalah hukum.
     Dipakai untuk memastikan pangkasan imbuhan menghasilkan kata yang benar:
     "penipuan" -> "tipu" (bukan "nipu"), "memukul" -> "pukul" (bukan "mukul"). */
  const AKAR = new Set(('pukul tipu aniaya curi bunuh rampas rampok ancam paksa cabul perkosa hina fitnah cemar maki caci ejek peras suap sogok korupsi tilep gelap titip pinjam ' +
    'kabur tangkap tahan siksa tendang tampar keroyok rusak hancur bakar banting retas bobol sebar teror takut leceh raba pegang cerai talak nikah kawin pecat gaji upah ' +
    'lembur cuti kontrak sewa jual beli bayar utang cicil tagih sita tarik rugi ganti janji ingkar tabrak lari lalai celaka hilang ambil bawa tadah judi selingkuh zina ' +
    'lacak intai tuduh lapor adu aduh gugat sidang vonis hukum denda penjara jaminan wajib hak kuasa surat tanda tangan palsu pura bohong jebak jerat todong begal copet ' +
    'maling bongkar masuk panjat rumah tanah batas geser serobot lukai luka sakit mati tewas habis hasut sebar unggah posting komen kirim transfer tagih tunggak ' +
    'kredit kembali tolak tahu beri minta tuntut ampun damai sepakat batal sah daftar catat cetak ukur timbang jual tukar gadai borong simpan sembunyi tutup buka tinggal ' +
    'telantar nafkah urus asuh didik lindung jaga selamat tolong bantu temu panggil periksa tanya jawab saksi bukti rekam foto video suara kunci sentuh cium peluk gerayang ' +
    'goda siul remas tekan paksa kurung larang atur kuasai kontrol rendah malu takut cemas stres jual edar pakai konsumsi rawat sembuh tilap gelapkan kerja libur istirahat ' +
    'kelahi mogok demo protes henti berhenti mundur keluar angkat tetap ubah ganti naik turun potong tahan telat lambat lunas cicil lunasi tabrak senggol lindas langgar terobos ' +
    'kendara parkir izin larang buang bunyi bising racun palsu kadaluarsa kedaluwarsa kemas label isi kurang lebih untung rugi untungkan rugikan lukai nyawa darah ' +
    'dukung tahan bela bebas lepas ringan berat tambah kurang sita blokir blokirkan klaim ajukan terima tolak setuju tandatangan materai meterai bajak jiplak tiru salin ' +
    'unduh hapus hilangkan sebarkan bagikan kuntit ikuti curiga laku kejar ganggu usik usir gusur ambruk robohkan bangun sewakan huni diam tinggalkan tenggang').split(/\s+/));

  /* Awalan -> kemungkinan pengganti huruf luluh. Diurutkan dari yang terpanjang. */
  const AWALAN = [
    ['memper', ['']], ['diper', ['']], ['meng', ['', 'k']], ['meny', ['s']], ['men', ['', 't']], ['mem', ['', 'p']],
    ['peng', ['', 'k']], ['peny', ['s']], ['pen', ['', 't']], ['pem', ['', 'p']], ['per', ['']], ['pe', ['']],
    ['me', ['']], ['di', ['']], ['ter', ['']], ['ber', ['']], ['be', ['']], ['ke', ['']], ['se', ['']], ['te', ['']]
  ];
  const AKHIRAN = ['kan', 'an', 'in', 'i'];
  const memoStem = new Map();

  /** Buang partikel dan kata ganti kepunyaan: -lah, -kah, -pun, -ku, -mu, -nya. */
  function buangPartikel(w) {
    let x = w.replace(/(lah|kah|pun)$/, '');
    if (x.length > 4) x = x.replace(/(ku|mu|nya)$/, '');
    return x.length >= 3 ? x : w;
  }

  /** Semua calon kata dasar setelah awalan dibuang (dengan peluluhan huruf pertama). */
  function buangAwalan(w) {
    const hasil = [];
    for (const [awal, pengganti] of AWALAN) {
      if (w.length - awal.length < 3 || !w.startsWith(awal)) continue;
      const sisa = w.slice(awal.length);
      for (const p of pengganti) {
        // luluh hanya masuk akal bila sisa diawali vokal (meng+ambil, pen+ipu, mem+ukul)
        if (p && !/^[aiueo]/.test(sisa)) continue;
        hasil.push(p + sisa);
      }
    }
    return hasil;
  }

  /**
   * TAHAP 2. Pangkas imbuhan bahasa Indonesia sampai kata dasar.
   * Contoh: dipukuli -> pukul, memukul -> pukul, penipuan -> tipu, penganiayaan -> aniaya.
   * Kandidat hasil pangkasan HARUS ada di daftar AKAR; jika tak ada yang cocok,
   * dipakai pangkasan cadangan (awalan umum + akhiran) agar kedua sisi tetap konsisten.
   * @param {string} kata  kata yang sudah dinormalisasi (huruf kecil)
   * @returns {string}
   */
  function stem(kata) {
    const w0 = String(kata || '').toLowerCase();
    if (w0.length <= 3) return w0;
    if (memoStem.has(w0)) return memoStem.get(w0);
    let hasil = stemInti(w0);
    memoStem.set(w0, hasil);
    return hasil;
  }

  function stemInti(w0) {
    if (AKAR.has(w0)) return w0;
    const dasar = [w0, buangPartikel(w0)];
    const tanpaAkhiran = new Set();
    for (const d of dasar) {
      tanpaAkhiran.add(d);
      for (const a of AKHIRAN) if (d.endsWith(a) && d.length - a.length >= 3) tanpaAkhiran.add(d.slice(0, -a.length));
    }
    // 1) coba semua kombinasi (akhiran dibuang dulu), terima yang ada di daftar akar
    for (const k of tanpaAkhiran) {
      if (AKAR.has(k)) return k;
      for (const c of buangAwalan(k)) {
        if (AKAR.has(c)) return c;
        for (const c2 of buangAwalan(c)) if (AKAR.has(c2)) return c2; // dua awalan: memper-, ke-ber-
      }
    }
    // 2) cadangan: pangkas akhiran + satu awalan umum, minimal 4 huruf tersisa
    let x = buangPartikel(w0);
    const suf = x.match(/(kan|an|i)$/);
    if (suf && x.length - suf[1].length >= 4) x = x.slice(0, -suf[1].length);
    const awal = buangAwalan(x).filter((c) => c.length >= 4);
    if (awal.length) {
      // pilih kandidat yang tidak diluluhkan (paling aman, deterministik)
      return awal[0];
    }
    return x;
  }

  /** Stem untuk frasa: tiap kata di-stem, dipisah spasi. */
  function stemFrasa(frasa) {
    return normalisasi(frasa).split(' ').filter(Boolean).map(stem).join(' ');
  }

  /** Kata-kata turunan umum dari sebuah akar (untuk kamus typo). */
  function turunan(a) {
    const luluh = { p: ['mem', 'pem'], t: ['men', 'pen'], k: ['meng', 'peng'], s: ['meny', 'peny'] };
    const f = new Set([a, 'di' + a, 'ter' + a, 'ber' + a, 'se' + a, 'ke' + a + 'an', 'pe' + a, 'per' + a + 'an', a + 'an', a + 'kan', a + 'i', 'di' + a + 'kan', 'di' + a + 'i', 'me' + a, 'meng' + a, 'meny' + a, 'men' + a, 'mem' + a, 'pe' + a + 'an', 'peng' + a + 'an', 'pen' + a + 'an', 'mem' + a + 'kan', 'meng' + a + 'kan']);
    const h = a[0];
    if (luluh[h]) {
      const sisa = a.slice(1);
      if (/^[aiueo]/.test(sisa)) {
        f.add(luluh[h][0] + sisa); f.add(luluh[h][1] + sisa); f.add(luluh[h][1] + sisa + 'an'); f.add('di' + a + 'in');
        f.add(luluh[h][0] + sisa + 'kan'); f.add(luluh[h][0] + sisa + 'i');
      }
    }
    return f;
  }

  // ------------------------------------------------------------------
  // TAHAP 3: FUZZY MATCHING (TOLERANSI TYPO)
  // ------------------------------------------------------------------
  /**
   * TAHAP 3. Jarak Levenshtein antara dua kata (jumlah minimum sisip/hapus/ganti huruf).
   * Variasi umum: dua huruf bertukar tempat ("pneipu" vs "penipu") dihitung 1 langkah,
   * karena ini kesalahan ketik paling sering.
   * @param {string} a
   * @param {string} b
   * @returns {number}
   */
  function levenshteinDistance(a, b) {
    if (a === b) return 0;
    const n = a.length, m = b.length;
    if (!n) return m;
    if (!m) return n;
    let dua = new Array(m + 1).fill(0);      // baris i-2
    let satu = new Array(m + 1);              // baris i-1
    for (let j = 0; j <= m; j++) satu[j] = j;
    for (let i = 1; i <= n; i++) {
      const baris = new Array(m + 1);
      baris[0] = i;
      for (let j = 1; j <= m; j++) {
        const biaya = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        let v = Math.min(satu[j] + 1, baris[j - 1] + 1, satu[j - 1] + biaya);
        if (i > 1 && j > 1 && a.charCodeAt(i - 1) === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) {
          v = Math.min(v, dua[j - 2] + 1); // tukar tempat
        }
        baris[j] = v;
      }
      dua = satu; satu = baris;
    }
    return satu[m];
  }

  /* Kata sehari-hari yang bukan typo; tidak pernah "dikoreksi" ke kata hukum yang mirip. */
  const UMUM = new Set(('makan minum masak pasar kawan teman kontak bareng cerah hujan jalan jalanan pulang pergi sekolah belajar sayur membeli berbelanja belanja warung toko tempat kantor kampus ' +
    'bagus jelek cantik tampan pintar bodoh rajin malas senang sedih marah kesal bingung capek lelah sakit sehat tidur bangun mandi cuaca panas dingin basah kering besar kecil panjang pendek ' +
    'tinggi rendah murah mahal banyak sedikit semua beberapa setiap masing lainnya lain pertama kedua ketiga terakhir sebelumnya selanjutnya berikutnya akhirnya awalnya biasanya sebenarnya ' +
    'sekitar sekitarnya dekat jauh depan belakang samping dalam luar atas bawah kiri kanan tengah pinggir kemudian sesudah setelah sebelum selama sejak hingga sampai ketika sementara sambil ' +
    'bertemu berbicara berkata bercerita bertanya menjawab menunggu berjalan berlari duduk berdiri melihat mendengar merasa berpikir mengingat lupa ingat tahu kenal paham mengerti ' +
    'kakak adik ayah ibu bapak nenek kakek paman bibi sepupu keponakan saudara tetangga warga pemilik pegawai karyawan majikan atasan bawahan sopir supir tukang dokter perawat guru murid ' +
    'mobil motor sepeda kendaraan bensin ponsel telepon handphone laptop komputer internet aplikasi pesan chat grup sosial media akun nomor alamat nama tanggal hasil ' +
    'rumah kamar dapur halaman jalan gang desa kecamatan kabupaten kota provinsi negara daerah wilayah lokasi tempat pasar mall stasiun terminal bandara hotel masjid gereja sekolah ' +
    'karena sehingga akibatnya padahal walaupun meskipun supaya ternyata rupanya tiba datang pulang berangkat lewat melewati bermain permainan olahraga musik lagu film acara ' +
    'perempuan laki lelaki wanita pria gadis bocah anak anaknya bayi remaja dewasa tua muda sendiri bersama berdua bertiga ramai sepi aman nyaman bahaya cemas ' +
    'pernah sering jarang kadang selalu setiap kemarin sekarang nanti besok lusa tadi barusan sedang baru lama cepat lambat pelan ' +
    'saya kamu dia mereka kami kita dirinya dirimu begitu begini demikian seperti bagaimana kenapa mengapa dimana kapan siapa berapa apakah ' +
    'bukan belum masih sudah telah akan pernah hanya cuma saja pula lagi juga ' +
    'uang bayar membayar pembayaran harga biaya tagihan cicilan gajian belanja kerjaan pekerjaan usaha bisnis dagang jualan ' +
    'terima kasih tolong mohon maaf permisi selamat pagi siang sore malam').split(/\s+/));

  /**
   * Apakah kata `a` boleh dianggap typo dari kata kosakata `b`?
   * Aturan hati-hati supaya kata biasa tidak salah dikoreksi (mis. "pasar" bukan typo "pagar"):
   *  - dua huruf bertukar tempat ("pneipu"): boleh mulai 5 huruf
   *  - satu huruf kurang/lebih ("penganiyaan"): boleh mulai 6 huruf
   *  - satu huruf salah ganti: hanya kata panjang (>= 8 huruf)
   *  - dua kesalahan: hanya kata >= 9 huruf, dan huruf awal harus sama
   */
  function typoBoleh(a, b) {
    if (a === b || UMUM.has(a)) return false;
    const d = levenshteinDistance(a, b);
    if (d === 0 || d > 2) return false;
    if (d === 1) {
      if (a.length === b.length) {
        let i = 0;
        while (a[i] === b[i]) i++;
        const tukar = a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
        return tukar ? a.length >= 5 : a.length >= 8;
      }
      return a.length >= 6;
    }
    return a.length >= 9 && a[0] === b[0];
  }

  // ------------------------------------------------------------------
  // TAHAP 4: KAMUS SINONIM & BIGRAM
  // ------------------------------------------------------------------
  /* Frasa (1-3 kata) atau kata gaul -> kata dasar yang dipakai kata kunci pasal.
     Frasa dicocokkan LEBIH DULU supaya "main tangan" tidak pecah jadi "main" + "tangan". */
  const SINONIM_BAWAAN = {
    // kekerasan fisik
    'main tangan': ['pukul', 'aniaya'], 'main kasar': ['pukul', 'kekerasan'], 'main pukul': ['pukul'], 'babak belur': ['pukul', 'luka'], 'dihajar': ['pukul'], 'hajar': ['pukul'],
    'gebuk': ['pukul'], 'digebuk': ['pukul'], 'gebukin': ['pukul'], 'tonjok': ['pukul'], 'ditonjok': ['pukul'], 'jotos': ['pukul'], 'gampar': ['tampar'], 'ditempeleng': ['tampar'], 'tempeleng': ['tampar'],
    'hantam': ['pukul'], 'dihantam': ['pukul'], 'pentung': ['pukul'], 'dipentung': ['pukul'], 'lebam': ['luka', 'memar'], 'berdarah': ['luka'], 'cedera': ['luka'], 'luka luka': ['luka'],
    'dikeroyok': ['keroyok'], 'rame rame': ['keroyok'], 'ramai ramai': ['keroyok'],
    // penipuan / penggelapan / pencurian
    'bawa kabur': ['tipu', 'gelap'], 'dibawa kabur': ['tipu', 'gelap'], 'bawa lari': ['tipu', 'gelap'], 'dibawa lari': ['tipu', 'gelap'], 'kena tipu': ['tipu'], 'tipu daya': ['tipu'], 'kibul': ['tipu'],
    'dikibulin': ['tipu'], 'dibohongi': ['tipu', 'bohong'], 'dibohongin': ['tipu', 'bohong'], 'scam': ['tipu'], 'penipu': ['tipu'], 'modus': ['tipu'], 'uang raib': ['tipu'], 'uang hilang': ['tipu'],
    'barang tidak dikirim': ['online', 'barang tidak dikirim'], 'barang tidak sampai': ['online', 'barang tidak sampai'], 'tidak dikirim kirim': ['online', 'tipu'],
    'jambret': ['curi', 'rampas'], 'dijambret': ['curi', 'rampas'], 'copet': ['curi'], 'dicopet': ['curi'], 'colong': ['curi'], 'nyolong': ['curi'], 'dicolong': ['curi'], 'ngembat': ['curi'], 'diembat': ['curi'],
    'raib': ['hilang'], 'lenyap': ['hilang'], 'kemalingan': ['curi', 'maling'], 'dibobol': ['bobol'], 'nilep': ['tilep'], 'ditilep': ['tilep'], 'ditilap': ['tilep'],
    // asusila
    'asusila': ['cabul', 'leceh'], 'mesum': ['cabul'], 'dicabuli': ['cabul'], 'grepe': ['cabul', 'raba'], 'digrepe': ['cabul', 'raba'], 'digrepe grepe': ['cabul', 'raba'], 'pegang pegang': ['pegang', 'cabul'],
    'rudapaksa': ['perkosa'], 'dirudapaksa': ['perkosa'], 'pelecehan seksual': ['cabul', 'leceh'], 'pelecehan': ['leceh'], 'dilecehkan': ['leceh'],
    // keluarga
    'main serong': ['selingkuh', 'zina'], 'main belakang': ['selingkuh'], 'ada wil': ['selingkuh'], 'wanita idaman lain': ['selingkuh'], 'ketahuan selingkuh': ['selingkuh', 'zina'],
    'pisah ranjang': ['cerai', 'pisah'], 'minta cerai': ['cerai'], 'mau pisah': ['cerai', 'pisah'], 'digugat cerai': ['cerai', 'gugat cerai'], 'ditalak': ['talak', 'cerai'],
    'kekerasan dalam rumah tangga': ['kdrt'], 'dianiaya suami': ['kdrt', 'suami'], 'dianiaya istri': ['kdrt', 'istri'], 'dipukuli suami': ['kdrt', 'suami', 'pukul'], 'dipukuli istri': ['kdrt', 'istri', 'pukul'],
    'tidak dinafkahi': ['nafkah', 'telantar'], 'tidak dikasih uang belanja': ['nafkah', 'telantar'], 'tidak dikasih nafkah': ['nafkah', 'telantar'],
    // ancaman / pencemaran / dunia maya
    'ngancem': ['ancam'], 'diancem': ['ancam'], 'akan dihabisi': ['ancam', 'bunuh'], 'mau dihabisi': ['ancam', 'bunuh'], 'dihabisi': ['ancam', 'bunuh'], 'dikata katain': ['hina', 'maki'], 'dikatain': ['hina'],
    'nama dicemarkan': ['cemar', 'nama baik'], 'jelek jelekin': ['hina', 'fitnah'], 'disebar': ['sebar'], 'diviralkan': ['viral', 'posting'], 'viral': ['posting', 'viral'], 'akun dibajak': ['hack', 'retas'], 'akun diretas': ['retas'],
    'dihack': ['retas', 'hack'], 'ktp disalahgunakan': ['data pribadi', 'ktp'], 'data bocor': ['data pribadi'], 'pinjol': ['utang', 'data pribadi'], 'pinjaman online': ['utang', 'data pribadi'], 'rentenir': ['utang'], 'ditagih': ['utang', 'tagih'],
    'debt collector': ['tarik', 'leasing'], 'dikejar debt collector': ['tarik', 'leasing'], 'motor ditarik': ['leasing', 'tarik'], 'mobil ditarik': ['leasing', 'tarik'],
    // pekerjaan
    'di phk': ['phk', 'pesangon'], 'kena phk': ['phk', 'pesangon'], 'diberhentikan': ['phk', 'pecat'], 'diberhentikan sepihak': ['phk', 'pecat'], 'dirumahkan': ['phk'], 'dikeluarkan dari kerjaan': ['phk', 'pecat'],
    'gaji belum dibayar': ['gaji', 'upah'], 'gaji ditahan': ['gaji', 'upah'], 'gaji nunggak': ['gaji', 'upah'], 'upah belum dibayar': ['gaji', 'upah'], 'telat gajian': ['gaji', 'upah'], 'kerja lembur': ['lembur'], 'kerja kelewat batas': ['lembur'],
    // lalu lintas
    'kabur': ['lari'], 'melarikan diri': ['kabur', 'lari'], 'lari dari tanggung jawab': ['kabur', 'lari'], 'tidak bertanggung jawab': ['kabur', 'lari'],
    'kabur setelah nabrak': ['tabrak lari'], 'nabrak lari': ['tabrak lari'], 'menabrak lalu kabur': ['tabrak lari'], 'ditilang': ['tilang'], 'surat kendaraan': ['stnk'], 'terobos lampu merah': ['lampu merah'],
    // narkoba
    'barang haram': ['narkotika'], 'putaw': ['narkotika'], 'inex': ['narkotika'], 'pil koplo': ['narkotika'], 'ngelinting': ['narkotika', 'ganja'], 'nyimpen sabu': ['sabu', 'memiliki'], 'jadi kurir sabu': ['kurir', 'edar'],
    // aparat / hukum acara
    'dijemput polisi': ['tangkap'], 'digrebek': ['tangkap'], 'diamankan polisi': ['tangkap'], 'ditangkap polisi': ['tangkap'], 'dikurung polisi': ['tahan'], 'dimasukkan sel': ['tahan'],
    'butuh pengacara': ['pengacara'], 'tidak punya uang untuk pengacara': ['tidak mampu', 'pengacara gratis'],
    // properti
    'diserobot': ['serobot'], 'tanah diserobot': ['serobot', 'tanah'], 'tanah diklaim': ['serobot', 'tanah'], 'patok digeser': ['patok', 'geser'],
    'dikontrakkan diam diam': ['sewa'], 'diusir dari kos': ['kos', 'pengusiran'], 'diusir dari kontrakan': ['kontrakan', 'pengusiran'], 'deposit tidak dikembalikan': ['deposit', 'sewa']
  };

  // ------------------------------------------------------------------
  // KATA YANG DIABAIKAN (stopword) saat stemming/typo; kata kunci tetap dicocokkan persis.
  // ------------------------------------------------------------------
  const STOP = new Set(('yang dan atau dalam untuk dengan pada oleh dari kepada adalah setiap sebagaimana dimaksud tersebut ini itu dia saya kamu kami kita mereka anda tidak telah akan juga ada bisa ' +
    'karena jika maka atas bila tapi lagi sudah belum bukan sangat sekali lalu kemudian tadi kemarin sekarang waktu ketika saat sebuah seorang suatu para sama bagi agar supaya hanya cuma masih sudahlah ' +
    'mau ingin hendak harus perlu boleh dapat mungkin sedang pernah selalu sering kadang terus lagi seperti sebagai antara ke di se dua tiga satu empat lima enam tujuh delapan sembilan nol puluh ratus belas ' +
    'minta kasih bilang katanya kata terus habis setelah sebelum sampai hingga tetapi namun padahal ternyata ya nih sih dong deh kok loh tuh aja saja banget dulu baru jadi buat bikin lalu pas apa siapa kenapa mengapa bagaimana ' +
    'hari minggu bulan tahun jam malam pagi siang sore besok tetangga teman orang rumah temen').split(/\s+/));

  // ------------------------------------------------------------------
  // PEMUATAN DATA (berbagi dengan ai-engine.js bila ada)
  // ------------------------------------------------------------------
  let sinonimJSON = null;
  let kamusSinonim = null;     // SINONIM_BAWAAN + sinonim.json, kunci sudah dinormalisasi
  let kamusKata = null;        // kosakata yang dikenal (untuk koreksi typo): kata -> stem
  let kataKunciPasal = null;   // pasal.id -> kata kunci siap-cocok
  let indeksKUHPStem = null;   // untuk kuhpTerkait
  let dbPasalCache = null;

  async function muatJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('Gagal memuat ' + url + ' (HTTP ' + r.status + ')');
    return r.json();
  }

  async function siapkan() {
    if (kamusKata && dbPasalCache) return;
    const [db, sin] = await Promise.all([
      window.BHMMesin.muatDatabase(),
      sinonimJSON ? Promise.resolve(sinonimJSON) : muatJSON('data/sinonim.json').catch(() => ({}))
    ]);
    sinonimJSON = sin || {};
    dbPasalCache = db;
    bangunKamus(db, sinonimJSON);
  }

  /** Bangun kamus sinonim (frasa -> daftar kata dasar), kosakata typo, dan kata kunci pasal. */
  function bangunKamus(db, sin) {
    kamusSinonim = new Map();
    const tambahSin = (kunci, daftar) => {
      const k = normalisasi(kunci);
      if (!k) return;
      const nilai = (daftar || []).map((x) => normalisasi(x)).filter(Boolean);
      if (!kamusSinonim.has(k)) kamusSinonim.set(k, new Set());
      for (const n of nilai) kamusSinonim.get(k).add(n);
    };
    for (const [k, v] of Object.entries(SINONIM_BAWAAN)) tambahSin(k, v);
    for (const [k, v] of Object.entries(sin)) tambahSin(k, v);

    kamusKata = new Map(); // kata (bentuk permukaan) -> stem
    const tambahKata = (w) => { if (w.length >= 4 && !STOP.has(w) && !kamusKata.has(w)) kamusKata.set(w, stem(w)); };
    for (const a of AKAR) for (const f of turunan(a)) tambahKata(f);
    kataKunciPasal = new Map();
    for (const e of db) {
      const daftar = [];
      for (const k of e.kata_kunci || []) {
        const kn = normalisasi(k);
        if (!kn) continue;
        const kataKata = kn.split(' ');
        kataKata.forEach(tambahKata);
        daftar.push({ asli: k, norm: kn, stem: kataKata.map(stem).join(' '), banyak: kataKata.length > 1 });
      }
      kataKunciPasal.set(e.id, daftar);
    }
    for (const [k, v] of kamusSinonim) { k.split(' ').forEach(tambahKata); for (const x of v) x.split(' ').forEach(tambahKata); }
  }

  /**
   * Koreksi satu kata ke kosakata terdekat (toleransi typo). Mengembalikan kata benar atau null.
   * Aturan lengkap ada di typoBoleh().
   */
  function koreksiKata(kata) {
    if (!kamusKata || kata.length < 5 || kamusKata.has(kata) || STOP.has(kata) || UMUM.has(kata)) return null;
    let terbaik = null, jarakTerbaik = 3;
    for (const k of kamusKata.keys()) {
      if (Math.abs(k.length - kata.length) > 2) continue;
      if (!typoBoleh(kata, k)) continue;
      const d = levenshteinDistance(kata, k);
      if (d < jarakTerbaik) { jarakTerbaik = d; terbaik = k; if (d === 1) break; }
    }
    return terbaik;
  }

  // ------------------------------------------------------------------
  // PRA-PEMROSESAN CERITA (tahap 1-4)
  // ------------------------------------------------------------------
  /**
   * Jalankan tahap 1-4 pada cerita. Hasilnya dipakai pemberi skor.
   * @returns {{normal:string, token:string[], stemSet:Set, sinonimSet:Set, typoSet:Set, catatan:object}}
   */
  function olahTeks(cerita) {
    const normal = normalisasi(cerita);
    const catatan = { stem: [], typo: [], sinonim: [] };
    // --- tahap 4a: frasa sinonim (bigram/trigram) diganti dulu, sebelum teks dipecah per kata ---
    const sinonimSet = new Set();
    let token = normal.split(' ').filter(Boolean);
    const frasaUrut = [...kamusSinonim.keys()].filter((f) => f.includes(' ')).sort((a, b) => b.split(' ').length - a.split(' ').length);
    for (const f of frasaUrut) {
      const pola = f.split(' ');
      for (let i = 0; i + pola.length <= token.length; i++) {
        if (pola.every((p, j) => token[i + j] === p)) {
          for (const x of kamusSinonim.get(f)) { for (const y of x.split(' ')) if (y) sinonimSet.add(stem(y)); sinonimSet.add(stemFrasa(x)); }
          catatan.sinonim.push({ dari: f, jadi: [...kamusSinonim.get(f)].join(', ') });
          token.splice(i, pola.length); // frasa tidak dipecah lagi menjadi kata tunggal
          i--;
        }
      }
    }
    // --- tahap 2 & 3: stem tiap kata, koreksi typo untuk kata yang tak dikenal ---
    const stemSet = new Set();
    const typoSet = new Set();
    // kata yang sudah habis dipakai frasa tidak dihitung ulang sebagai kata tunggal sinonim
    for (const w of token) {
      const s = stem(w);
      if (s !== w) catatan.stem.push({ dari: w, jadi: s });
      stemSet.add(s);
      // sinonim kata tunggal
      const sn = kamusSinonim.get(w);
      if (sn) for (const x of sn) for (const y of x.split(' ')) sinonimSet.add(stem(y));
      // typo: kata tak dikenal yang mirip kosakata
      if (!STOP.has(w) && w.length >= 5 && !kamusKata.has(w)) {
        const benar = koreksiKata(w);
        if (benar) {
          const sb = kamusKata.get(benar);
          typoSet.add(sb);
          catatan.typo.push({ dari: w, jadi: benar });
          const sn2 = kamusSinonim.get(benar);
          if (sn2) for (const x of sn2) for (const y of x.split(' ')) sinonimSet.add(stem(y));
        }
      }
    }
    return { normal, token, stemSet, sinonimSet, typoSet, catatan };
  }

  /** Apakah rangkaian stem frasa (mis. "pukul anak") muncul berurutan (boleh selang <= 1 kata) di cerita. */
  function frasaAda(stemToken, stemKunci) {
    const bagian = stemKunci.split(' ');
    const idx = [];
    let mulai = 0;
    for (const b of bagian) {
      let ketemu = -1;
      for (let i = mulai; i < Math.min(stemToken.length, mulai + (idx.length ? 3 : stemToken.length)); i++) {
        if (stemToken[i] === b) { ketemu = i; break; }
      }
      if (ketemu < 0) return false;
      idx.push(ketemu);
      mulai = ketemu + 1;
    }
    return true;
  }

  // ------------------------------------------------------------------
  // SKOR PASAL
  // ------------------------------------------------------------------
  /** Beri skor satu pasal terhadap hasil olahTeks. */
  function skorPasal(e, o) {
    const teksPad = ' ' + o.normal + ' ';
    const stemToken = o.token.map(stem);
    const gabung = new Set([...o.stemSet, ...o.sinonimSet]);
    const terbaik = new Map(); // kelompok stem -> bukti terbaik (satu akar kata dihitung sekali)
    for (const k of kataKunciPasal.get(e.id) || []) {
      let nilai = 0, jenis = '';
      if (teksPad.includes(' ' + k.norm + ' ') || (!k.banyak && k.norm.length > 3 && teksPad.includes(k.norm))) {
        nilai = k.banyak ? SKOR.FRASA : SKOR.PERSIS; jenis = 'persis';
      } else if (k.banyak ? frasaAda(stemToken, k.stem) : (o.stemSet.has(k.stem) && !STOP.has(k.stem))) {
        nilai = k.banyak ? SKOR.AKAR + 0.5 : SKOR.AKAR; jenis = 'akar';
      } else if (k.banyak ? k.stem.split(' ').every((s) => gabung.has(s)) && k.stem.split(' ').some((s) => o.sinonimSet.has(s)) : o.sinonimSet.has(k.stem)) {
        nilai = k.banyak ? SKOR.SINONIM + 1 : SKOR.SINONIM; jenis = 'sinonim';
      } else if (!k.banyak && o.typoSet.has(k.stem)) {
        nilai = SKOR.TYPO; jenis = 'typo';
      }
      if (!nilai) continue;
      const lama = terbaik.get(k.stem);
      if (!lama) terbaik.set(k.stem, { kata: k.asli, jenis, nilai, banyak: 1 });
      else { lama.banyak += 1; if (nilai > lama.nilai) { lama.kata = k.asli; lama.jenis = jenis; lama.nilai = nilai; } }
    }
    let skor = 0;
    let lunak = false;
    const cocok = [];
    const rincian = [];
    // satu akar kata dihitung sekali, ditambah 0.5 per kata kunci kembar (maksimal +1)
    for (const r of terbaik.values()) {
      skor += r.nilai + Math.min(1, 0.5 * (r.banyak - 1));
      if (r.jenis === 'sinonim' || r.jenis === 'typo') lunak = true;
      cocok.push(r.kata); rincian.push({ kata: r.kata, jenis: r.jenis, nilai: r.nilai });
    }
    if (skor < SKOR_MINIMAL && !(lunak && skor >= SKOR_MINIMAL_LUNAK)) skor = 0;
    return { e, skor, cocok, rincian };
  }

  // ------------------------------------------------------------------
  // FUNGSI UTAMA
  // ------------------------------------------------------------------
  /**
   * analisisTeks(ceritaUser): pengganti analisis() lama. Menjalankan tahap 1-4, mencocokkan
   * kata ke 89 pasal pilihan, lalu mengembalikan struktur yang SAMA dengan versi lama
   * ({utama, alternatif, uuTerkait, kuhpTerkait, stats}) ditambah field `nlp` berisi
   * catatan proses (kata yang dipangkas, typo yang diperbaiki, sinonim yang terpicu).
   * @param {string} ceritaUser
   * @returns {Promise<object>}
   */
  async function analisisTeks(ceritaUser) {
    await siapkan();
    // UU terkait + pasal KUHP terkait tetap dihitung oleh pipeline dasar (kini memakai stem baru)
    const dasar = await window.BHMMesin.analisisDasar(ceritaUser);
    const o = olahTeks(ceritaUser);
    const terbobot = dbPasalCache.map((e) => skorPasal(e, o)).filter((x) => x.skor > 0);
    terbobot.sort((a, b) => b.skor - a.skor || b.cocok.length - a.cocok.length);
    const utama = terbobot[0] || null;
    const alternatif = terbobot.slice(1, 3).filter((x) => x.skor >= Math.max(SKOR_MINIMAL, (utama ? utama.skor : 0) * 0.55));
    return {
      utama: utama ? { pasal: utama.e, cocok: utama.cocok, skor: round(utama.skor), rincian: utama.rincian } : null,
      alternatif: alternatif.map((x) => ({ pasal: x.e, cocok: x.cocok, skor: round(x.skor), rincian: x.rincian })),
      uuTerkait: dasar.uuTerkait,
      kuhpTerkait: dasar.kuhpTerkait,
      stats: dasar.stats,
      nlp: { normal: o.normal, catatan: o.catatan }
    };
  }
  function round(n) { return Math.round(n * 10) / 10; }

  /** Tersedia untuk ai-engine.js: koreksi kata kueri + stem yang sama dipakai di pencarian KUHP. */
  function koreksiUntukKueri(kata) {
    return kamusKata ? (koreksiKata(kata) || null) : null;
  }

  window.BHMNLP = {
    normalisasi, stem, stemFrasa, levenshteinDistance, angkaKeTeks, olahTeks: (c) => olahTeks(c), analisisTeks,
    koreksiKata: koreksiUntukKueri, siapkan, SKOR,
    _uji: { skorPasal, kamus: () => ({ kamusSinonim, kamusKata, kataKunciPasal }), olahTeks }
  };

  // Pasang sebagai analisis() bawaan app.js bila ai-engine.js sudah ada.
  if (window.BHMMesin && window.BHMMesin.analisisDasar) {
    window.BHMMesin.analisis = analisisTeks;
  }
})();
