/* nlp.js — Türkçe komut metnini anlamlandıran yardımcılar.
   Burası uygulamanın "dil" katmanı: tarih, saat, sayı, tekrar, isim çözümleme.
   Komutların kendisi commands.js'te; burası sadece ham metinden veri çıkarır. */
window.SK = window.SK || {};
(function (SK) {
  'use strict';

  var AYLAR = {
    ocak: 0, şubat: 1, subat: 1, mart: 2, nisan: 3, mayıs: 4, mayis: 4, haziran: 5,
    temmuz: 6, ağustos: 7, agustos: 7, eylül: 8, eylul: 8, ekim: 9,
    kasım: 10, kasim: 10, aralık: 11, aralik: 11
  };

  var GUNLER = {
    pazartesi: 1, salı: 2, sali: 2, çarşamba: 3, carsamba: 3, perşembe: 4,
    persembe: 4, cuma: 5, cumartesi: 6, pazar: 0
  };

  var SAYILAR = {
    sıfır: 0, sifir: 0, bir: 1, iki: 2, üç: 3, uc: 3, dört: 4, dort: 4, beş: 5, bes: 5,
    altı: 6, alti: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10, yirmi: 20, otuz: 30,
    kırk: 40, kirk: 40, elli: 50, altmış: 60, altmis: 60, yetmiş: 70, yetmis: 70,
    seksen: 80, doksan: 90, yüz: 100, yuz: 100
  };

  // Günün vakitleri -> varsayılan saat. Konuşmada saat verilmezse bunlar kullanılır.
  var VAKITLER = {
    sabah: { h: 9, m: 0, oglenSonrasi: false },
    sabahleyin: { h: 9, m: 0, oglenSonrasi: false },
    öğlen: { h: 12, m: 30, oglenSonrasi: true },
    oglen: { h: 12, m: 30, oglenSonrasi: true },
    öğle: { h: 12, m: 30, oglenSonrasi: true },
    ogle: { h: 12, m: 30, oglenSonrasi: true },
    ikindi: { h: 16, m: 0, oglenSonrasi: true },
    akşam: { h: 20, m: 0, oglenSonrasi: true },
    aksam: { h: 20, m: 0, oglenSonrasi: true },
    akşamları: { h: 20, m: 0, oglenSonrasi: true },
    aksamlari: { h: 20, m: 0, oglenSonrasi: true },
    gece: { h: 22, m: 0, oglenSonrasi: true }
  };

  /* Türkçe küçük harf. JS'in toLowerCase'i I -> i yapar, bizde I -> ı olmalı. */
  function trLower(s) {
    return String(s || '').replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
  }

  /* Konuşmadan gelen metni tekdüze hale getirir.
     Rakam arasındaki nokta/iki nokta saat sayılır (14.30 -> 14:30), gerisi ayıklanır. */
  function normalize(s) {
    return trLower(s)
      .replace(/[’‘`´]/g, "'")
      .replace(/(\d)\s*[.:]\s*(\d)/g, '$1:$2')
      .replace(/[.,!?;–—]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokenize(s) {
    var n = normalize(s);
    return n ? n.split(' ') : [];
  }

  /* Bir kelime, verilen köklerden biriyle başlıyor mu?
     Türkçe ekleri tek tek yazmak yerine kök karşılaştırması yapıyoruz:
     "günde", "günü", "gün" hepsi "gün" kökünü tutar. */
  function kokMu(kelime, kokler) {
    for (var i = 0; i < kokler.length; i++) {
      if (kelime.indexOf(kokler[i]) === 0) return true;
    }
    return false;
  }

  function kokIndex(tokens, kokler) {
    for (var i = 0; i < tokens.length; i++) {
      if (kokMu(tokens[i], kokler)) return i;
    }
    return -1;
  }

  /* Verilen konumdan geriye doğru sayı okur: "10 gün" ya da "on beş gün".
     Kelimeyle yazılmış sayılarda "on beş" -> 10 + 5 mantığı yeterli. */
  function oncekiSayi(tokens, i) {
    var parcalar = [];
    for (var j = i - 1; j >= 0; j--) {
      var t = tokens[j];
      if (/^\d+$/.test(t)) { parcalar.unshift(parseInt(t, 10)); break; }
      if (Object.prototype.hasOwnProperty.call(SAYILAR, t)) { parcalar.unshift(SAYILAR[t]); continue; }
      break;
    }
    if (!parcalar.length) return null;
    var toplam = 0;
    for (var k = 0; k < parcalar.length; k++) toplam += parcalar[k];
    return toplam;
  }

  /* "3 gün", "iki hafta" gibi <sayı><birim> kalıbını arar. */
  function sayiliBirim(tokens, kokler) {
    var i = kokIndex(tokens, kokler);
    if (i === -1) return null;
    var n = oncekiSayi(tokens, i);
    return n === null ? null : { sayi: n, index: i };
  }

  function gunEkle(d, n) {
    var x = new Date(d.getTime());
    x.setDate(x.getDate() + n);
    return x;
  }

  function gunBasi(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }

  /* Metinden tarih çıkarır. Sadece gün/ay/yıl döner, saat ayrı ayrıştırılır.
     Bulamazsa null döner (çağıran taraf varsayılanına karar verir). */
  function tarihCoz(metin, simdi) {
    var now = simdi || new Date();
    var tokens = tokenize(metin);
    var bugun = gunBasi(now);
    var t = tokens.join(' ');

    if (/\bbugün\b|\bbugun\b/.test(t)) return bugun;
    if (/\byarın\b|\byarin\b/.test(t)) return gunEkle(bugun, 1);
    if (/öbür gün|obur gun|öbürgün|oburgun|ertesi gün|ertesi gun/.test(t)) return gunEkle(bugun, 2);
    if (/\bhaftaya\b/.test(t)) return gunEkle(bugun, 7);

    // "10 gün sonra", "2 hafta sonra", "3 ay sonra"
    if (kokIndex(tokens, ['sonra']) !== -1) {
      var g = sayiliBirim(tokens, ['gün', 'gun']);
      if (g) return gunEkle(bugun, g.sayi);
      var h = sayiliBirim(tokens, ['hafta']);
      if (h) return gunEkle(bugun, h.sayi * 7);
      var a = sayiliBirim(tokens, ['ay']);
      if (a && tokens[a.index] !== 'ayın' && tokens[a.index] !== 'ayin') {
        var d = new Date(bugun.getTime());
        d.setMonth(d.getMonth() + a.sayi);
        return d;
      }
    }

    // "15 eylül" / "15 eylülde"
    for (var i = 0; i < tokens.length; i++) {
      var ay = null;
      for (var adi in AYLAR) {
        if (Object.prototype.hasOwnProperty.call(AYLAR, adi) && tokens[i].indexOf(adi) === 0) {
          ay = AYLAR[adi];
          break;
        }
      }
      if (ay === null) continue;
      var gunNo = oncekiSayi(tokens, i);
      if (gunNo === null) continue;
      var yil = now.getFullYear();
      var aday = new Date(yil, ay, gunNo);
      if (aday < bugun) aday = new Date(yil + 1, ay, gunNo);
      return aday;
    }

    // "pazartesi", "cuma" -> gelecek ilk o gün
    for (var j = 0; j < tokens.length; j++) {
      for (var gAdi in GUNLER) {
        if (!Object.prototype.hasOwnProperty.call(GUNLER, gAdi)) continue;
        if (tokens[j].indexOf(gAdi) !== 0) continue;
        var hedef = GUNLER[gAdi];
        var fark = (hedef - bugun.getDay() + 7) % 7;
        if (fark === 0) fark = 7;
        return gunEkle(bugun, fark);
      }
    }

    return null;
  }

  /* Metinden saat çıkarır. {h, m} döner, bulamazsa null. */
  function saatCoz(metin) {
    var n = normalize(metin);
    var tokens = n.split(' ');

    var vakit = null;
    for (var i = 0; i < tokens.length; i++) {
      if (Object.prototype.hasOwnProperty.call(VAKITLER, tokens[i])) { vakit = VAKITLER[tokens[i]]; break; }
      // "akşamları", "sabahları" gibi ekli hâller
      for (var v in VAKITLER) {
        if (Object.prototype.hasOwnProperty.call(VAKITLER, v) && tokens[i].indexOf(v) === 0) { vakit = VAKITLER[v]; break; }
      }
      if (vakit) break;
    }

    // 14:30
    var m = n.match(/(\d{1,2}):(\d{2})/);
    if (m) {
      var h1 = parseInt(m[1], 10);
      if (vakit && vakit.oglenSonrasi && h1 < 12) h1 += 12;
      return { h: h1, m: parseInt(m[2], 10) };
    }

    // "saat 9", "saat dokuz", "saat 9'da"
    var si = kokIndex(tokens, ['saat']);
    if (si !== -1 && si + 1 < tokens.length) {
      var sonraki = tokens[si + 1];
      var h2 = null;
      var dm = sonraki.match(/^(\d{1,2})/);
      if (dm) h2 = parseInt(dm[1], 10);
      else if (Object.prototype.hasOwnProperty.call(SAYILAR, sonraki)) h2 = SAYILAR[sonraki];
      if (h2 !== null && h2 >= 0 && h2 <= 23) {
        if (vakit && vakit.oglenSonrasi && h2 < 12) h2 += 12;
        return { h: h2, m: 0 };
      }
    }

    // "sabah 9", "akşam 8" — vakit kelimesinden sonra çıplak sayı
    for (var k = 0; k < tokens.length; k++) {
      var isVakit = false;
      var vk = null;
      for (var vv in VAKITLER) {
        if (Object.prototype.hasOwnProperty.call(VAKITLER, vv) && tokens[k].indexOf(vv) === 0) { isVakit = true; vk = VAKITLER[vv]; break; }
      }
      if (!isVakit || k + 1 >= tokens.length) continue;
      var nx = tokens[k + 1];
      var h3 = null;
      var dm2 = nx.match(/^(\d{1,2})/);
      if (dm2) h3 = parseInt(dm2[1], 10);
      else if (Object.prototype.hasOwnProperty.call(SAYILAR, nx)) h3 = SAYILAR[nx];
      if (h3 !== null && h3 >= 0 && h3 <= 23) {
        if (vk.oglenSonrasi && h3 < 12) h3 += 12;
        return { h: h3, m: 0 };
      }
    }

    if (vakit) return { h: vakit.h, m: vakit.m };
    return null;
  }

  /* "bir gün önceden", "2 saat önce", "yarım saat önce" -> dakika cinsinden uyarı payı.
     Dikkat: cümlede birden fazla süre olabilir ("10 gün sonra ... bir gün önceden").
     Bu yüzden metnin tamamına değil, yalnızca "önce" kelimesinin hemen soluna bakıyoruz. */
  function hatirlatmaPayiCoz(metin) {
    var tokens = tokenize(metin);
    var oi = kokIndex(tokens, ['önce', 'once']);
    if (oi === -1 || oi === 0) return null;

    var birim = tokens[oi - 1];
    if (tokens[oi - 2] === 'yarım' || tokens[oi - 2] === 'yarim') {
      if (kokMu(birim, ['saat'])) return 30;
      if (kokMu(birim, ['gün', 'gun'])) return 12 * 60;
    }

    var n = oncekiSayi(tokens, oi - 1);
    if (n === null) n = 1; // "gün önceden" -> bir gün

    if (kokMu(birim, ['gün', 'gun'])) return n * 24 * 60;
    if (kokMu(birim, ['hafta'])) return n * 7 * 24 * 60;
    if (kokMu(birim, ['saat'])) return n * 60;
    if (kokMu(birim, ['dakika', 'dk'])) return n;
    return null;
  }

  /* İlaç/tekrarlı hatırlatma kalıbı:
     "1 hafta sabah ve akşam 12 saat arayla" -> {gunSayisi:7, saatler:[{9,0},{21,0}]} */
  function tekrarCoz(metin) {
    var tokens = tokenize(metin);
    var t = tokens.join(' ');

    var gunSayisi = null;
    var h = sayiliBirim(tokens, ['hafta']);
    if (h) gunSayisi = h.sayi * 7;
    if (gunSayisi === null) {
      var g = sayiliBirim(tokens, ['gün', 'gun']);
      // "12 saat arayla" içindeki gün değil, süre olan gün
      if (g) gunSayisi = g.sayi;
    }
    if (gunSayisi === null) {
      var a = sayiliBirim(tokens, ['ay']);
      if (a) gunSayisi = a.sayi * 30;
    }

    var sabahVar = /\bsabah/.test(t);
    var aksamVar = /\bakşam|\baksam/.test(t);
    var oglenVar = /\böğle|\bogle|\böğlen|\boglen/.test(t);

    // "12 saat arayla" / "8 saatte bir"
    var araSaat = null;
    var arayla = t.match(/(\d+)\s*saat\s*(?:arayla|ara ile|arayla|de bir|te bir|da bir|ta bir|bir)/);
    if (arayla) araSaat = parseInt(arayla[1], 10);
    if (araSaat === null) {
      var idx = kokIndex(tokens, ['aray', 'arayla', 'aralık', 'aralik']);
      if (idx !== -1) {
        var sa = sayiliBirim(tokens, ['saat']);
        if (sa) araSaat = sa.sayi;
      }
    }

    // "günde 3 kez/kere/defa"
    var adet = null;
    var kez = t.match(/günde\s*(\d+)|gunde\s*(\d+)/);
    if (kez) adet = parseInt(kez[1] || kez[2], 10);

    var saatler = [];
    if (araSaat && araSaat > 0 && araSaat <= 24) {
      var baslangic = sabahVar ? 9 : 8;
      var kacKez = Math.max(1, Math.round(24 / araSaat));
      for (var i = 0; i < kacKez; i++) {
        saatler.push({ h: (baslangic + i * araSaat) % 24, m: 0 });
      }
    } else if (sabahVar && aksamVar && oglenVar) {
      saatler = [{ h: 8, m: 0 }, { h: 14, m: 0 }, { h: 20, m: 0 }];
    } else if (sabahVar && aksamVar) {
      saatler = [{ h: 9, m: 0 }, { h: 21, m: 0 }];
    } else if (adet) {
      // "günde 3 kez" gibi ifadelerde 24 saate bölmek gece yarısı dozu üretir.
      // Kullanıcı açıkça saat aralığı vermediyse dozları uyanık olunan
      // 08:00–20:00 aralığına yayıyoruz.
      if (adet === 1) {
        saatler.push({ h: 9, m: 0 });
      } else {
        var ara = Math.floor(12 / (adet - 1));
        for (var j = 0; j < adet; j++) saatler.push({ h: 8 + j * ara, m: 0 });
      }
    } else if (sabahVar) {
      saatler = [{ h: 9, m: 0 }];
    } else if (aksamVar) {
      saatler = [{ h: 21, m: 0 }];
    }

    if (!saatler.length) return null;
    return {
      gunSayisi: gunSayisi || 7,
      saatler: saatler,
      araSaat: araSaat
    };
  }

  /* Metinden verilen kelimeleri temizler.
     "youtube uygulamamdan türk sanat müziği aç" -> "türk sanat müziği"

     kokler: önek olarak eşleşir ("hatırlat" -> "hatırlatır mısın" da düşer).
     tamKelimeler: yalnızca birebir eşleşir. Kısa ve tehlikeli kelimeler buraya
     konmalı — "ay" öneki olsaydı "Ayşe" de silinirdi. */
  function kelimeleriAt(metin, kokler, tamKelimeler) {
    var tokens = tokenize(metin);
    var tam = tamKelimeler || [];
    var kalan = [];
    for (var i = 0; i < tokens.length; i++) {
      if (kokMu(tokens[i], kokler)) continue;
      if (tam.indexOf(tokens[i]) !== -1) continue;
      kalan.push(tokens[i]);
    }
    return kalan.join(' ').trim();
  }

  /* İki ismin aynı kişiyi gösterip göstermediğini bulur.
     Türkçe ek düşürmek yerine karşılıklı önek kontrolü yapıyoruz:
     "oğlumu" ile "oğlum", "ahmet'i" ile "ahmet" eşleşir. */
  function isimEslesir(soylenen, kayitli) {
    var a = normalize(soylenen).replace(/'.*$/, '');
    var b = normalize(kayitli).replace(/'.*$/, '');
    if (!a || !b) return false;
    if (a === b) return true;
    var kisa = a.length < b.length ? a : b;
    if (kisa.length < 3) return false;
    return a.indexOf(b) === 0 || b.indexOf(a) === 0;
  }

  function ikiHane(n) { return (n < 10 ? '0' : '') + n; }

  function tarihYaz(d) {
    var gunAdlari = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    var ayAdlari = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return d.getDate() + ' ' + ayAdlari[d.getMonth()] + ' ' + d.getFullYear() + ' ' + gunAdlari[d.getDay()];
  }

  function saatYaz(d) {
    return ikiHane(d.getHours()) + ':' + ikiHane(d.getMinutes());
  }

  function sureYaz(dakika) {
    if (dakika % 1440 === 0) return (dakika / 1440) + ' gün önce';
    if (dakika % 60 === 0) return (dakika / 60) + ' saat önce';
    return dakika + ' dakika önce';
  }

  SK.nlp = {
    trLower: trLower,
    normalize: normalize,
    tokenize: tokenize,
    kokMu: kokMu,
    kokIndex: kokIndex,
    tarihCoz: tarihCoz,
    saatCoz: saatCoz,
    hatirlatmaPayiCoz: hatirlatmaPayiCoz,
    tekrarCoz: tekrarCoz,
    kelimeleriAt: kelimeleriAt,
    isimEslesir: isimEslesir,
    tarihYaz: tarihYaz,
    saatYaz: saatYaz,
    sureYaz: sureYaz,
    ikiHane: ikiHane,
    gunEkle: gunEkle,
    gunBasi: gunBasi
  };
})(window.SK);
