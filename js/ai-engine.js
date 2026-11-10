/* ===== Mesin pencocokan BHM v2 =====
   Mencocokkan cerita pengguna ke database pasal (data/pasal.json) dan
   indeks 1.900+ UU (data/uu-index.json). Semua berjalan lokal di browser;
   tidak ada teks yang keluar dari HP. Ini pencocokan kata kunci berbobot
   dengan sinonim bahasa sehari-hari, BUKAN kecerdasan buatan. */
(function () {
  'use strict';

  let database = null;
  let sinonim = null;
  let indeksUU = null;
  let kuhp = null;

  async function muatJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('Gagal memuat ' + url + ' (HTTP ' + r.status + ')');
    return r.json();
  }

  async function muatDatabase() {
    if (database) return database;
    const [pasal, sin] = await Promise.all([muatJSON('data/pasal.json'), muatJSON('data/sinonim.json')]);
    database = pasal;
    sinonim = sin;
    return database;
  }

  async function muatIndeksUU() {
    if (indeksUU) return indeksUU;
    indeksUU = await muatJSON('data/uu-index.json');
    return indeksUU;
  }

  /** 624 pasal KUHP baru (UU No. 1 Tahun 2023), teks asli dari salinan resmi. */
  async function muatKUHP() {
    if (kuhp) return kuhp;
    kuhp = await muatJSON('data/kuhp.json');
    return kuhp;
  }

  /* Kata yang muncul di hampir semua pasal; dibuang dari penilaian agar tidak semua pasal ikut terbawa. */
  const STOP = new Set('yang dan atau dalam untuk dengan pada oleh dari kepada adalah setiap sebagaimana dimaksud tersebut ini itu dia saya tidak telah akan juga ada bisa karena jika maka atas bila tapi lagi sudah pidana pasal dipidana penjara denda kategori orang barang tindak huruf ayat paling lama sekurang kurangnya tahun bulan melakukan melakukannya ancaman ketentuan lainnya seorang diri'.split(' '));

  /** Pemangkasan imbuhan kasar bahasa Indonesia (awalan+akhiran umum). */
  function batang(w) {
    // v6: bila mesin NLP (nlp-engine.js) termuat, pakai stemmer yang lebih akurat
    if (window.BHMNLP && window.BHMNLP.stem) return window.BHMNLP.stem(w);
    w = w.replace(/(nya|kan|an|i)$/, '');
    w = w.replace(/^(meng|meny|men|mem|peng|peny|pen|pem|per|ber|ter|me|pe|di|ke|se|be|te)/, '');
    return w;
  }

  /* Jembatan bahasa sehari-hari -> istilah yang dipakai bunyi pasal resmi. */
  const PETA = { bunuh: ['rampas', 'nyawa'], encana: ['rencana'], sabu: ['narkotika'], narkoba: ['narkotika'], ganja: ['narkotika'], pukul: ['aniaya', 'keras'], aniaya: ['keras'], tendang: ['keras'], suami: ['rumah', 'tangga', 'keras', 'fisik'], istri: ['rumah', 'tangga', 'keras', 'fisik'], kdrt: ['rumah', 'tangga', 'keras', 'fisik'], curi: ['ambil', 'barang'], korupsi: ['perkaya', 'negara'], hina: ['hormat', 'baik', 'tuduh'], cemar: ['hormat', 'baik', 'nama'], fitnah: ['hormat', 'tuduh'], perkosa: ['seksual', 'setubuh', 'keras'], rampok: ['keras', 'ancam'], tipu: ['bohong', 'muslihat'], gerombolan: ['sama', 'umum', 'keras'], tawuran: ['sama', 'umum', 'kelahi'], bakar: ['ledakan'], hoaks: ['bohong'], gelap: ['milik', 'kuasa'], peras: ['paksa', 'untung'], ancam: ['takut'] };

  /** Kumpulkan kata dasar berbobot dari cerita + sinonim. */
  function kumpulkanKata(cerita, tambahan) {
    const kata = new Map();
    function tambah(w, bobot) {
      const t = norm(w).trim();
      if (t.length < 4) return;
      let b = batang(t);
      if (STOP.has(t) || STOP.has(b)) return;
      // v6: toleransi typo pada kueri (mis. "pneipu" -> "penipu")
      const benar = window.BHMNLP && window.BHMNLP.koreksiKata ? window.BHMNLP.koreksiKata(t) : null;
      if (benar) { b = batang(benar); }
      kata.set(b, bobot);
      for (const m of (PETA[t] || PETA[b] || [])) kata.set(m, Math.max(kata.get(m) || 0, bobot));
    }
    for (const w of cerita.split(/\s+/)) tambah(w, 2);
    for (const w of tambahan) tambah(w, 2);
    return kata;
  }

  /**
   * Cari di 624 pasal KUHP. Kueri "pasal 338" langsung membuka pasal itu.
   * Selain itu kata kueri (plus sinonim) dicocokkan ke bunyi pasal; frasa multi-kata lebih berbobot.
   */
  async function cariKUHP(kueri, batas) {
    const db = await muatKUHP();
    await muatDatabase().catch(() => null); // untuk sinonim
    const q = norm(kueri).trim();
    const mm = q.match(/(?:pasal\s*)?(\d{1,3})/);
    const langsung = (mm && /pasal/.test(q)) ? db.find((e) => e.n === Number(mm[1])) : null;
    const { tambahan } = perluas(' ' + q + ' ');
    const kata = kumpulkanKata(q, tambahan);
    const hasil = [];
    for (const e of db) {
      if (langsung && e.n === langsung.n) continue;
      const toks = new Set(norm(e.bunyi).split(' ').filter((x) => x.length > 3).map(batang));
      let s = 0;
      const cocok = [];
      for (const [b, bt] of kata) {
        if (toks.has(b)) { s += bt; cocok.push(b); }
      }
      if (s >= 4) hasil.push({ e, s, cocok });
    }
    hasil.sort((a, b) => b.s - a.s);
    const atas = hasil.slice(0, batas || 8).map((x) => ({ n: x.e.n, buku: x.e.buku, bab: x.e.bab, bunyi: x.e.bunyi, cocok: x.cocok }));
    if (langsung) atas.unshift({ n: langsung.n, buku: langsung.buku, bab: langsung.bab, bunyi: langsung.bunyi, cocok: ['nomor pasal'] });
    return atas;
  }

  async function bacaPasal(n) {
    const db = await muatKUHP();
    const e = db.find((x) => x.n === Number(n));
    return e || null;
  }

  /** Normalisasi: huruf kecil, tanda baca jadi spasi, spasi dirapikan. */
  function norm(s) {
    return (' ' + (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ') + ' ');
  }

  /** Apakah frasa (bisa multi-kata) muncul utuh di teks ternormalisasi. */
  function cocokFrasa(teks, frasa) {
    return teks.includes(' ' + norm(frasa).trim() + ' ') || teks.includes(norm(frasa));
  }

  /** Perluas teks dengan sinonim bahasa sehari-hari. */
  function perluas(teksNorm) {
    const tambahan = new Set();
    const ketemu = [];
    for (const [frasa, padanan] of Object.entries(sinonim || {})) {
      if (cocokFrasa(teksNorm, frasa)) {
        ketemu.push(frasa);
        for (const p of padanan) tambahan.add(p);
      }
    }
    return { tambahan: [...tambahan], frasaSinonim: ketemu };
  }

  /**
   * Analisis cerita: kembalikan pasal utama + alternatif + UU terkait.
   * Skor: frasa multi-kata bernilai lebih; kata dari perluasan sinonim bernilai separuh.
   */
  async function analisisDasar(cerita) {
    const db = await muatDatabase();
    const idx = await muatIndeksUU().catch(() => null);
    const teks = norm(cerita);
    const { tambahan } = perluas(teks);
    const setTambahan = new Set(tambahan);

    const terbobot = db.map((e) => {
      let skor = 0;
      const cocok = [];
      for (const k of e.kata_kunci || []) {
        const kn = norm(k).trim();
        if (!kn) continue;
        if (teks.includes(' ' + kn + ' ') || teks.includes(kn)) {
          const bobot = kn.includes(' ') ? 3 : 2;
          skor += bobot;
          cocok.push(k);
        } else if (setTambahan.has(kn)) {
          skor += 1;
          cocok.push(k);
        }
      }
      // sedikit bobot bila kategori muncul sebagai sinonim yang terpicu
      return { e, skor, cocok };
    }).filter((x) => x.skor > 0);

    terbobot.sort((a, b) => b.skor - a.skor || (b.e.kata_kunci || []).length - (a.e.kata_kunci || []).length);
    const utama = terbobot[0] || null;
    const alternatif = terbobot.slice(1, 3).filter((x) => x.skor >= Math.max(2, (utama ? utama.skor : 0) - 3));

    // UU terkait dari indeks besar
    let uuTerkait = [];
    if (idx) {
      const token = new Set(teks.split(' ').filter((w) => w.length > 3));
      for (const t of tambahan) for (const w of t.split(' ')) if (w.length > 3) token.add(w);
      const skorUU = idx.uu.map((u) => {
        let s = 0;
        let hits = 0;
        for (const k of u.k || []) {
          if (teks.includes(k)) { s += 2; hits++; }
          else if (token.has(k)) { s += 1; hits++; }
        }
        const mm = u.n.match(/No\. (\d+) Tahun (\d{4})/);
        if (mm && POPULER.has(mm[1] + '/' + mm[2])) s += 1;
        return { u, s, hits };
      }).filter((x) => x.hits >= 2);
      skorUU.sort((a, b) => b.s - a.s);
      uuTerkait = skorUU.slice(0, 5).map((x) => x.u);
    }

    // Pasal KUHP (UU 1/2023) yang ikut cocok dari kata + sinonim cerita
    let kuhpTerkait = [];
    try {
      const kata = kumpulkanKata(cerita, tambahan);
      const dbK = await muatKUHP();
      const skorK = [];
      for (const e of dbK) {
        const toks = new Set(norm(e.bunyi).split(' ').filter((x) => x.length > 3).map(batang));
        let s = 0;
        const cocok = [];
        for (const [b, bt] of kata) {
          if (toks.has(b)) { s += bt; cocok.push(b); }
        }
        if (s >= 4) skorK.push({ e, s, cocok });
      }
      skorK.sort((a, b) => b.s - a.s);
      kuhpTerkait = skorK.slice(0, 3).map((x) => ({ n: x.e.n, buku: x.e.buku, bab: x.e.bab, bunyi: x.e.bunyi, cocok: x.cocok }));
    } catch (e) { /* data KUHP tidak wajib */ }

    return {
      utama: utama ? { pasal: utama.e, cocok: utama.cocok, skor: utama.skor } : null,
      alternatif: alternatif.map((x) => ({ pasal: x.e, cocok: x.cocok, skor: x.skor })),
      uuTerkait,
      kuhpTerkait,
      stats: { jumlah_pasal: db.length, jumlah_kuhp: kuhp ? kuhp.length : 0, jumlah_uu: idx ? idx.total : 0 }
    };
  }

  const POPULER = new Set(['1/2023','1/2024','27/2022','13/2003','8/1999','22/2009','1/1974','16/2019','23/2004','12/2022','35/2009','31/1999','20/2001','35/2014','5/1960','37/2004','42/1999','28/2014','8/2010','10/2020','11/2008','19/2016','16/2011','20/2025','1/1946','44/2008','14/2005','32/2009','7/1992']);

  /** Pencarian bebas di indeks UU (untuk alat Jelajah UU). */
  async function cariUU(kueri, batas) {
    const idx = await muatIndeksUU();
    const q = norm(kueri);
    const kata = q.split(' ').filter((w) => w.length > 2);
    const skor = [];
    for (const u of idx.uu) {
      const teksJudul = norm(u.n + ' ' + u.u);
      const setK = new Set(u.k || []);
      let s = 0;
      let semuaCocok = true;
      for (const w of kata) {
        if (setK.has(w)) s += 3;
        else if (teksJudul.includes(w)) s += 1;
        else { semuaCocok = false; break; }
      }
      if (semuaCocok && s > 0) {
        // dorong undang-undang landmark yang paling sering dicari rakyat
        const mm = u.n.match(/No\. (\d+) Tahun (\d{4})/);
        if (mm && POPULER.has(mm[1] + '/' + mm[2])) s += 2;
        skor.push({ u, s });
      }
    }
    const tahun = (u) => Number((u.n.match(/Tahun (\d{4})/) || [0, 0])[1]);
    skor.sort((a, b) => b.s - a.s || tahun(b.u) - tahun(a.u));
    return skor.slice(0, batas || 30).map((x) => x.u);
  }

  function urlResmi(u) {
    return 'https://peraturan.bpk.go.id/Details/' + u.d + '/' + u.s;
  }

  window.BHMMesin = { muatDatabase, muatIndeksUU, muatKUHP, analisis: analisisDasar, analisisDasar, cariUU, cariKUHP, bacaPasal, urlResmi };
})();
