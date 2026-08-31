/* app.js — Arayüz, mikrofon ve depolama.
   Komut mantığı burada yok; burası sadece "sesi metne çevir, motora ver, sonucu göster". */
window.SK = window.SK || {};
(function (SK) {
  'use strict';

  var nlp = SK.nlp;
  var act = SK.actions;

  var REHBER_ANAHTAR = 'sk_rehber_v1';
  var KAYIT_ANAHTAR = 'sk_kayit_v1';

  var el = {};
  var taniyici = null;
  var dinliyor = false;
  var sonKart = null;

  /* ---------------- Depolama ---------------- */

  function oku(anahtar, varsayilan) {
    try {
      var ham = localStorage.getItem(anahtar);
      return ham ? JSON.parse(ham) : varsayilan;
    } catch (e) { return varsayilan; }
  }

  function yaz(anahtar, deger) {
    try { localStorage.setItem(anahtar, JSON.stringify(deger)); } catch (e) { /* özel mod */ }
  }

  function rehberAl() { return oku(REHBER_ANAHTAR, []); }
  function rehberYaz(liste) { yaz(REHBER_ANAHTAR, liste); }

  function kayitAl() { return oku(KAYIT_ANAHTAR, []); }

  function kayitEkle(giris) {
    var liste = kayitAl();
    liste.unshift(giris);
    yaz(KAYIT_ANAHTAR, liste.slice(0, 200));
  }

  /* ---------------- Komut motoruna verilen bağlam ---------------- */

  var ctx = {
    rehberBul: function (isim) {
      var liste = rehberAl();
      for (var i = 0; i < liste.length; i++) {
        if (nlp.isimEslesir(isim, liste[i].isim)) return liste[i];
      }
      // Tek tek kelimeleri de dene: "benim oğlumu" -> "oğlum"
      var parcalar = nlp.tokenize(isim);
      for (var j = 0; j < parcalar.length; j++) {
        for (var k = 0; k < liste.length; k++) {
          if (nlp.isimEslesir(parcalar[j], liste[k].isim)) return liste[k];
        }
      }
      return null;
    },
    rehberEkleFormu: function (isim) {
      sekmeAc('rehber');
      el.rehberIsim.value = isim;
      el.rehberNumara.value = '';
      el.rehberNumara.focus();
    },
    istekKaydet: function (metin, tur) {
      kayitEkle({ metin: metin, tur: tur, zaman: Date.now(), anlasildi: false });
    }
  };

  /* ---------------- Arayüz ---------------- */

  function sekmeAc(ad) {
    ['komut', 'rehber', 'kayit'].forEach(function (s) {
      var panel = document.getElementById('panel-' + s);
      var dugme = document.getElementById('sekme-' + s);
      if (panel) panel.hidden = (s !== ad);
      if (dugme) dugme.classList.toggle('etkin', s === ad);
    });
    if (ad === 'rehber') rehberCiz();
    if (ad === 'kayit') kayitCiz();
  }

  function durumYaz(metin, sinif) {
    el.durum.textContent = metin;
    el.durum.className = 'durum ' + (sinif || '');
  }

  function kartCiz(kart) {
    sonKart = kart;
    el.kart.innerHTML = '';
    if (!kart) { el.kart.hidden = true; return; }
    el.kart.hidden = false;
    el.kart.className = 'kart' + (kart.uyari ? ' uyari' : '');

    var h = document.createElement('h2');
    h.textContent = kart.baslik;
    el.kart.appendChild(h);

    if (kart.satirlar && kart.satirlar.length) {
      var dl = document.createElement('dl');
      kart.satirlar.forEach(function (s) {
        var dt = document.createElement('dt');
        dt.textContent = s.etiket;
        var dd = document.createElement('dd');
        dd.textContent = s.deger;
        dl.appendChild(dt);
        dl.appendChild(dd);
      });
      el.kart.appendChild(dl);
    }

    if (kart.aciklama) {
      var p = document.createElement('p');
      p.className = 'aciklama';
      p.textContent = kart.aciklama;
      el.kart.appendChild(p);
    }

    if (kart.aksiyonlar && kart.aksiyonlar.length) {
      var kutu = document.createElement('div');
      kutu.className = 'aksiyonlar';
      kart.aksiyonlar.forEach(function (a) {
        var d;
        if (a.tip === 'link') {
          d = document.createElement('a');
          d.href = a.href;
          if (a.href.indexOf('http') === 0) { d.target = '_blank'; d.rel = 'noopener'; }
        } else {
          d = document.createElement('button');
          d.type = 'button';
          d.addEventListener('click', a.islev);
        }
        d.className = 'aksiyon' + (a.birincil ? ' birincil' : '');
        d.textContent = a.etiket;
        kutu.appendChild(d);
      });
      el.kart.appendChild(kutu);
    }
  }

  /* ---------------- Komut işleme ---------------- */

  function komutIsle(metin) {
    if (!metin || !metin.trim()) return;
    el.duyulan.textContent = metin;
    el.duyulan.hidden = false;

    var kart = SK.komutlar.calistir(metin, ctx);

    if (!kart) {
      ctx.istekKaydet(metin, 'anlasilmadi');
      kartCiz({
        baslik: 'Bunu anlayamadım',
        uyari: true,
        satirlar: [{ etiket: 'Duyduğum', deger: metin }],
        aciklama: 'Komut kaydedildi. Kayıtlar sekmesinden bakabilirsin — anlaşılmayan komutlar, sıradaki sürümde neyi eklememiz gerektiğini gösteriyor.',
        aksiyonlar: []
      });
      act.konus('Bunu anlayamadım.');
      return;
    }

    kayitEkle({ metin: metin, tur: kart.komutId, zaman: Date.now(), anlasildi: true });
    kartCiz(kart);
    if (kart.soyle) act.konus(kart.soyle);
  }

  /* ---------------- Mikrofon ---------------- */

  function taniyiciKur() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    var r = new SR();
    r.lang = 'tr-TR';
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 3;

    r.onstart = function () {
      dinliyor = true;
      el.mikrofon.classList.add('dinliyor');
      durumYaz('Dinliyorum…', 'aktif');
      el.duyulan.textContent = '';
      el.duyulan.hidden = true;
    };

    r.onresult = function (olay) {
      var ara = '';
      var kesin = '';
      for (var i = olay.resultIndex; i < olay.results.length; i++) {
        var p = olay.results[i][0].transcript;
        if (olay.results[i].isFinal) kesin += p; else ara += p;
      }
      if (ara) {
        el.duyulan.hidden = false;
        el.duyulan.textContent = ara;
      }
      if (kesin) komutIsle(kesin.trim());
    };

    r.onerror = function (olay) {
      dinliyor = false;
      el.mikrofon.classList.remove('dinliyor');
      var mesajlar = {
        'not-allowed': 'Mikrofon izni verilmedi. Tarayıcı adres çubuğundaki kilit simgesinden izin ver.',
        'service-not-allowed': 'Mikrofon izni verilmedi.',
        'no-speech': 'Ses duyamadım, tekrar dene.',
        'audio-capture': 'Mikrofon bulunamadı.',
        'network': 'Ses tanıma için internet bağlantısı gerekiyor.',
        'aborted': 'Dinleme durduruldu.'
      };
      durumYaz(mesajlar[olay.error] || ('Hata: ' + olay.error), 'hata');
    };

    r.onend = function () {
      dinliyor = false;
      el.mikrofon.classList.remove('dinliyor');
      if (el.durum.classList.contains('aktif')) durumYaz('Konuşmak için butona bas', '');
    };

    return r;
  }

  function mikrofonuAcKapa() {
    if (!taniyici) return;
    if (dinliyor) { taniyici.stop(); return; }
    // iOS'ta konuşma sentezinin çalışması için ilk kullanıcı dokunuşu gerekiyor;
    // burada boş bir seslendirme ile motoru uyandırıyoruz.
    try { window.speechSynthesis.resume(); } catch (e) { /* yok say */ }
    try { taniyici.start(); } catch (e) { durumYaz('Zaten dinliyor.', ''); }
  }

  /* ---------------- Rehber ---------------- */

  function rehberCiz() {
    var liste = rehberAl();
    el.rehberListe.innerHTML = '';
    if (!liste.length) {
      var bos = document.createElement('p');
      bos.className = 'bos';
      bos.textContent = 'Rehber boş. "oğlum", "annem", "eşim" gibi günlük konuşmada kullandığın adlarla ekle — komutlarda o adları söyleyeceksin.';
      el.rehberListe.appendChild(bos);
      return;
    }
    liste.forEach(function (k, i) {
      var satir = document.createElement('div');
      satir.className = 'rehber-satir';

      var bilgi = document.createElement('div');
      bilgi.className = 'rehber-bilgi';
      var ad = document.createElement('strong');
      ad.textContent = k.isim;
      var num = document.createElement('span');
      num.textContent = k.numara;
      bilgi.appendChild(ad);
      bilgi.appendChild(num);

      var sil = document.createElement('button');
      sil.type = 'button';
      sil.className = 'sil';
      sil.textContent = 'Sil';
      sil.addEventListener('click', function () {
        var l = rehberAl();
        l.splice(i, 1);
        rehberYaz(l);
        rehberCiz();
      });

      satir.appendChild(bilgi);
      satir.appendChild(sil);
      el.rehberListe.appendChild(satir);
    });
  }

  function rehberKaydet() {
    var isim = nlp.normalize(el.rehberIsim.value);
    var numara = act.numarayiTemizle(el.rehberNumara.value);
    if (!isim) { el.rehberIsim.focus(); return; }
    if (numara.length < 7) { el.rehberNumara.focus(); return; }

    var liste = rehberAl();
    var guncellendi = false;
    for (var i = 0; i < liste.length; i++) {
      if (liste[i].isim === isim) { liste[i].numara = numara; guncellendi = true; break; }
    }
    if (!guncellendi) liste.push({ isim: isim, numara: numara });
    rehberYaz(liste);
    el.rehberIsim.value = '';
    el.rehberNumara.value = '';
    rehberCiz();
  }

  /* ---------------- Kayıtlar ---------------- */

  function kayitCiz() {
    var liste = kayitAl();
    el.kayitListe.innerHTML = '';

    var anlasilmayan = liste.filter(function (k) { return !k.anlasildi; }).length;
    el.kayitOzet.textContent = liste.length
      ? liste.length + ' komut denendi · ' + anlasilmayan + ' tanesi anlaşılamadı'
      : 'Henüz komut denenmedi.';

    liste.slice(0, 60).forEach(function (k) {
      var satir = document.createElement('div');
      satir.className = 'kayit-satir' + (k.anlasildi ? '' : ' eksik');
      var m = document.createElement('span');
      m.className = 'kayit-metin';
      m.textContent = k.metin;
      var e = document.createElement('span');
      e.className = 'kayit-etiket';
      e.textContent = k.anlasildi ? k.tur : 'anlaşılmadı';
      satir.appendChild(m);
      satir.appendChild(e);
      el.kayitListe.appendChild(satir);
    });
  }

  /* Kayıtları düz metin olarak panoya kopyalar — telefonda da tek yol bu,
     çünkü kayıtlar tarayıcının deposunda duruyor, dosyada değil. */
  function kayitMetni() {
    var liste = kayitAl();
    if (!liste.length) return 'Kayıt yok.';
    return liste.map(function (k) {
      var tarih = new Date(k.zaman).toLocaleString('tr-TR');
      return tarih + ' | ' + (k.anlasildi ? k.tur : 'ANLAŞILMADI') + ' | ' + k.metin;
    }).join('\n');
  }

  function kayitKopyala() {
    var metin = kayitMetni();
    var bildir = function (ok) {
      el.kayitKopyala.textContent = ok ? 'Kopyalandı ✓' : 'Kopyalanamadı — elle seç';
      setTimeout(function () { el.kayitKopyala.textContent = 'Kayıtları kopyala'; }, 2500);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(metin).then(function () { bildir(true); }, function () { bildir(eskiUsulKopyala(metin)); });
    } else {
      bildir(eskiUsulKopyala(metin));
    }
  }

  function eskiUsulKopyala(metin) {
    var alan = document.createElement('textarea');
    alan.value = metin;
    alan.setAttribute('readonly', '');
    alan.style.position = 'fixed';
    alan.style.top = '-1000px';
    document.body.appendChild(alan);
    alan.select();
    var oldu = false;
    try { oldu = document.execCommand('copy'); } catch (e) { oldu = false; }
    document.body.removeChild(alan);
    return oldu;
  }

  /* ---------------- Başlangıç ---------------- */

  function baslat() {
    el.mikrofon = document.getElementById('mikrofon');
    el.durum = document.getElementById('durum');
    el.duyulan = document.getElementById('duyulan');
    el.kart = document.getElementById('kart');
    el.yaziGiris = document.getElementById('yazi-giris');
    el.yaziGonder = document.getElementById('yazi-gonder');
    el.platform = document.getElementById('platform');
    el.rehberIsim = document.getElementById('rehber-isim');
    el.rehberNumara = document.getElementById('rehber-numara');
    el.rehberKaydet = document.getElementById('rehber-kaydet');
    el.rehberListe = document.getElementById('rehber-liste');
    el.kayitListe = document.getElementById('kayit-liste');
    el.kayitOzet = document.getElementById('kayit-ozet');
    el.kayitKopyala = document.getElementById('kayit-kopyala');

    el.platform.textContent = act.platform.adi;

    ['komut', 'rehber', 'kayit'].forEach(function (s) {
      document.getElementById('sekme-' + s).addEventListener('click', function () { sekmeAc(s); });
    });

    taniyici = taniyiciKur();
    if (!taniyici) {
      el.mikrofon.disabled = true;
      durumYaz('Bu tarayıcı ses tanımayı desteklemiyor. Chrome veya Edge kullan — aşağıdan yazarak da deneyebilirsin.', 'hata');
    } else if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      durumYaz('Mikrofon için sayfa https:// veya localhost üzerinden açılmalı. Şimdilik aşağıdan yazarak dene.', 'hata');
    } else {
      durumYaz('Konuşmak için butona bas', '');
    }

    el.mikrofon.addEventListener('click', mikrofonuAcKapa);
    el.kayitKopyala.addEventListener('click', kayitKopyala);

    el.yaziGonder.addEventListener('click', function () {
      komutIsle(el.yaziGiris.value);
      el.yaziGiris.value = '';
    });
    el.yaziGiris.addEventListener('keydown', function (olay) {
      if (olay.key === 'Enter') {
        komutIsle(el.yaziGiris.value);
        el.yaziGiris.value = '';
      }
    });

    Array.prototype.forEach.call(document.querySelectorAll('.ornek'), function (d) {
      d.addEventListener('click', function () { komutIsle(d.textContent); });
    });

    el.rehberKaydet.addEventListener('click', rehberKaydet);
    el.rehberNumara.addEventListener('keydown', function (olay) {
      if (olay.key === 'Enter') rehberKaydet();
    });

    sekmeAc('komut');
  }

  document.addEventListener('DOMContentLoaded', baslat);
})(window.SK);
