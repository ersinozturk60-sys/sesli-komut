/* commands.js — Komut motoru.
   Her komut kendi eşleşme kuralını ve ne yapacağını bilir; motor sırayla dener.
   Yeni komut eklemek = bu listeye bir nesne eklemek. Arayüz ve ses katmanı değişmez.

   Bir komutun döndürdüğü "kart", ekranda gösterilecek onay kutusudur:
   uygulama komutu anladığını gösterir, işi kullanıcı butona basınca yapar.
   Ses tanıma hiçbir zaman %100 değil — bu yüzden hiçbir şey sorulmadan yapılmaz. */
window.SK = window.SK || {};
(function (SK) {
  'use strict';

  var nlp = SK.nlp;
  var act = SK.actions;

  var ARA_FIILLERI = ['ara', 'arasana', 'arayalım', 'arayalim', 'arar', 'ararmısın',
    'ararmisin', 'arayabilir', 'arayıver', 'ariyver', 'çağır', 'cagir'];

  var ARA_DOLGU = ['bana', 'lütfen', 'lutfen', 'hemen', 'şimdi', 'simdi', 'telefon',
    'et', 'edeyim', 'numarasını', 'numarasini', 'bir', 'de', 'da'];

  function basHarf(s) {
    if (!s) return s;
    var ilk = s.charAt(0);
    ilk = ilk === 'i' ? 'İ' : ilk.toLocaleUpperCase('tr-TR');
    return ilk + s.slice(1);
  }

  function tarihSaatBirlestir(tarih, saat) {
    var d = new Date(tarih.getTime());
    d.setHours(saat.h, saat.m, 0, 0);
    return d;
  }

  /* ---------------------------------------------------------------- */

  var KOMUTLAR = [];

  /* 1) Yardım */
  KOMUTLAR.push({
    id: 'yardim',
    ad: 'Yardım',
    ornekler: ['neler yapabilirsin'],
    eslesir: function (metin) {
      var t = nlp.normalize(metin);
      if (/ne(ler)? yapabilirsin|yardım|yardim|komutlar|nasıl kullan|nasil kullan/.test(t)) return {};
      return null;
    },
    calistir: function () {
      return {
        baslik: 'Şu an bildiğim komutlar',
        satirlar: [
          { etiket: 'Arama', deger: '"oğlumu ara"' },
          { etiket: 'YouTube', deger: '"youtube\'dan türk sanat müziği aç"' },
          { etiket: 'Randevu', deger: '"10 gün sonra doktor randevum var, bir gün önceden hatırlat"' },
          { etiket: 'İlaç', deger: '"şu ilacı 1 hafta sabah akşam 12 saat arayla hatırlat"' }
        ],
        soyle: 'Arama yapabilir, YouTube açabilir ve hatırlatma kurabilirim.',
        aksiyonlar: []
      };
    }
  });

  /* 2) Kişi arama —  "oğlumu ara" */
  KOMUTLAR.push({
    id: 'ara',
    ad: 'Telefon araması',
    ornekler: ['oğlumu ara', 'annemi ara', '0532 111 22 33 ara'],
    eslesir: function (metin) {
      var tokens = nlp.tokenize(metin);
      var fiilVar = false;
      for (var i = 0; i < tokens.length; i++) {
        if (ARA_FIILLERI.indexOf(tokens[i]) !== -1) { fiilVar = true; break; }
      }
      if (!fiilVar) return null;

      // Doğrudan numara söylendiyse rehbere hiç bakmayalım
      var rakamlar = nlp.normalize(metin).replace(/[^\d]/g, '');
      if (rakamlar.length >= 10) return { numara: rakamlar };

      var kalan = [];
      for (var j = 0; j < tokens.length; j++) {
        if (ARA_FIILLERI.indexOf(tokens[j]) !== -1) continue;
        if (ARA_DOLGU.indexOf(tokens[j]) !== -1) continue;
        kalan.push(tokens[j]);
      }
      if (!kalan.length) return null;
      return { isim: kalan.join(' ') };
    },
    calistir: function (slot, ctx) {
      if (slot.numara) {
        return {
          baslik: 'Aranacak numara',
          satirlar: [{ etiket: 'Numara', deger: slot.numara }],
          soyle: 'Numarayı arıyorum.',
          aksiyonlar: [{ etiket: '📞 Ara', tip: 'link', href: act.aramaLinki(slot.numara), birincil: true }]
        };
      }

      var kisi = ctx.rehberBul(slot.isim);
      if (!kisi) {
        return {
          baslik: 'Rehberde bulamadım',
          uyari: true,
          satirlar: [{ etiket: 'Aradığın', deger: slot.isim }],
          soyle: slot.isim + ' rehberde kayıtlı değil.',
          aciklama: 'Telefonun kendi rehberini bir web uygulaması okuyamaz. Bu kişiyi bir kez uygulamaya tanıtman yeterli, sonra hep hatırlar.',
          aksiyonlar: [{
            etiket: '➕ "' + slot.isim + '" kişisini ekle',
            tip: 'islev',
            birincil: true,
            islev: function () { ctx.rehberEkleFormu(slot.isim); }
          }]
        };
      }

      return {
        baslik: basHarf(kisi.isim) + ' aranıyor',
        satirlar: [
          { etiket: 'Kişi', deger: basHarf(kisi.isim) },
          { etiket: 'Numara', deger: kisi.numara }
        ],
        soyle: kisi.isim + ' aranıyor.',
        aksiyonlar: [{ etiket: '📞 Ara', tip: 'link', href: act.aramaLinki(kisi.numara), birincil: true }]
      };
    }
  });

  /* 3) YouTube — "youtube uygulamamdan türk sanat müziği şarkıları aç" */
  KOMUTLAR.push({
    id: 'youtube',
    ad: 'YouTube',
    ornekler: ['youtube\'dan türk sanat müziği aç'],
    eslesir: function (metin) {
      var t = nlp.normalize(metin);
      if (!/youtube|yutup|yutub/.test(t)) return null;
      var sorgu = nlp.kelimeleriAt(metin, [
        'youtube', 'yutup', 'yutub', 'uygulama', 'programı', 'programi',
        'aç', 'ac', 'çal', 'cal', 'başlat', 'baslat', 'dinle', 'oynat',
        'arat', 'bul', 'bana', 'lütfen', 'lutfen', 'üzerinden', 'uzerinden'
      ]);
      if (!sorgu) return null;
      return { sorgu: sorgu };
    },
    calistir: function (slot) {
      var y = act.youtubeAra(slot.sorgu);
      return {
        baslik: 'YouTube\'da açılacak',
        satirlar: [{ etiket: 'Arama', deger: slot.sorgu }],
        soyle: slot.sorgu + ' açılıyor.',
        aciklama: act.platform.mobil
          ? 'Telefonda önce YouTube uygulaması denenir, kurulu değilse tarayıcıda açılır.'
          : 'Masaüstünde yeni sekmede açılır. Telefonda YouTube uygulaması açılacak.',
        aksiyonlar: [{
          etiket: '▶ YouTube\'da aç',
          tip: 'islev',
          birincil: true,
          islev: function () { act.derinLinkAc(y.uygulama, y.web); }
        }]
      };
    }
  });

  /* 4) İlaç / tekrarlı hatırlatma —
        "şu ilacı 1 hafta sabah ve akşamları 12 saat arayla içmem lazım, hatırlat"
        Tarihli tek seferlik hatırlatmadan ÖNCE denenmeli: ikisi de tarih kelimeleri içeriyor. */
  KOMUTLAR.push({
    id: 'ilac',
    ad: 'Tekrarlı hatırlatma',
    ornekler: ['şu ilacı 1 hafta sabah akşam 12 saat arayla hatırlat'],
    eslesir: function (metin) {
      var t = nlp.normalize(metin);
      var ilacVar = /ilaç|ilac|hap|şurup|surup|iğne|igne/.test(t);
      var tekrarVar = /arayla|ara ile|günde|gunde|saatte bir|her gün|her gun|sabah.*akşam|sabah.*aksam/.test(t);
      if (!ilacVar && !tekrarVar) return null;
      var tekrar = nlp.tekrarCoz(metin);
      if (!tekrar) return null;

      var ad = 'İlaç';
      var m = t.match(/([a-zçğıöşü]+)\s+ila[cç]/);
      if (m && ['şu', 'su', 'bu', 'o', 'bir', 'bu', 'benim'].indexOf(m[1]) === -1) {
        ad = basHarf(m[1]);
      }
      return { tekrar: tekrar, ad: ad };
    },
    calistir: function (slot) {
      var t = slot.tekrar;
      var bugun = nlp.gunBasi(new Date());
      var simdi = new Date();

      var etkinlikler = t.saatler.map(function (s) {
        var ilk = tarihSaatBirlestir(bugun, s);
        // Bugünün o saati geçtiyse ilk dozu yarından başlat
        if (ilk < simdi) ilk = tarihSaatBirlestir(nlp.gunEkle(bugun, 1), s);
        return {
          baslik: slot.ad + ' saati',
          aciklama: t.gunSayisi + ' gün boyunca, günde ' + t.saatler.length + ' kez.',
          baslangic: ilk,
          dakika: 10,
          uyariDakika: 0,
          tekrarGun: t.gunSayisi
        };
      });

      var saatMetni = t.saatler.map(function (s) {
        return nlp.ikiHane(s.h) + ':' + nlp.ikiHane(s.m);
      }).join(' — ');

      var ics = act.icsUret(etkinlikler);

      return {
        baslik: slot.ad + ' hatırlatması',
        satirlar: [
          { etiket: 'Süre', deger: t.gunSayisi + ' gün' },
          { etiket: 'Saatler', deger: saatMetni },
          { etiket: 'Toplam', deger: (t.gunSayisi * t.saatler.length) + ' hatırlatma' },
          { etiket: 'İlk doz', deger: nlp.tarihYaz(etkinlikler[0].baslangic) + ' ' + nlp.saatYaz(etkinlikler[0].baslangic) }
        ],
        soyle: t.gunSayisi + ' gün boyunca günde ' + t.saatler.length + ' kez hatırlatma kuruldu.',
        aciklama: 'Takvime eklendiğinde uygulama kapalıyken de alarm çalar.',
        aksiyonlar: [{
          etiket: '📅 Takvime ekle',
          tip: 'islev',
          birincil: true,
          islev: function () { act.icsIndir(ics, 'ilac-hatirlatma'); }
        }]
      };
    }
  });

  /* 5) Tek seferlik hatırlatma —
        "10 gün sonra doktor randevum var, bana bir gün önceden hatırlat" */
  KOMUTLAR.push({
    id: 'hatirlatma',
    ad: 'Hatırlatma',
    ornekler: ['10 gün sonra doktor randevum var, bir gün önceden hatırlat'],
    eslesir: function (metin) {
      var t = nlp.normalize(metin);
      // "alarm kur" da buraya düşüyor: web uygulaması kendi başına alarm kuramaz,
      // ama takvim etkinliği aynı işi görüyor — uygulama kapalıyken de çalıyor.
      var niyet = /hatırlat|hatirlat|randevu|toplantı|toplanti|doğum günü|dogum gunu|unutma|not et|alarm|uyandır|uyandir/.test(t);
      if (!niyet) return null;
      var tarih = nlp.tarihCoz(metin);
      if (!tarih) return null;
      return {
        tarih: tarih,
        saat: nlp.saatCoz(metin),
        pay: nlp.hatirlatmaPayiCoz(metin),
        metin: metin
      };
    },
    calistir: function (slot) {
      var saat = slot.saat || { h: 9, m: 0 };
      var ne = tarihSaatBirlestir(slot.tarih, saat);
      var pay = slot.pay === null || slot.pay === undefined ? 60 : slot.pay;

      // Başlığı bulmak için tarih/saat/hatırlatma kelimelerini metinden düşürüyoruz.
      // "doğum günü" tek parça korunmalı, yoksa "günü" tarih kelimesi sanılıp siliniyor.
      // Not: \w Türkçe harfleri kapsamaz ("ü" dışarıda kalır), o yüzden \S kullanıyoruz.
      var ham = nlp.normalize(slot.metin).replace(/do[ğg]um\s+g[üu]n\S*/g, 'doğumgünü');

      var baslik = nlp.kelimeleriAt(ham, [
        'gün', 'gun', 'hafta', 'sonra', 'saat', 'dakika', 'önce', 'once',
        'hatırlat', 'hatirlat', 'lütfen', 'lutfen', 'yarın', 'yarin',
        'kurmanı', 'kurmani', 'istiyorum', 'uyandır', 'uyandir',
        'bugün', 'bugun', 'haftaya', 'sabah', 'akşam', 'aksam', 'öğle', 'ogle',
        'öğlen', 'oglen', 'gece', 'ikindi', 'unutma',
        'pazartesi', 'çarşamba', 'carsamba', 'perşembe', 'persembe',
        'cumartesi', 'ocak', 'şubat', 'subat', 'nisan',
        'haziran', 'temmuz', 'ağustos', 'agustos', 'eylül', 'eylul',
        'kasım', 'kasim', 'aralık', 'aralik'
      ], [
        // Kısa kelimeler: yalnızca birebir eşleşmeli
        'ay', 'var', 'bana', 'kur', 'ekle', 'sakın', 'sakin', 'bir', 'iki', 'üç', 'uc',
        'salı', 'sali', 'cuma', 'pazar', 'mart', 'mayıs', 'mayis', 'ekim',
        'de', 'da', 'ki', 'yarım', 'yarim', 'lazım', 'lazim'
      ])
        .replace(/\b\d{1,2}:\d{2}\b/g, '')  // "14:30" gibi saat kalıntıları
        .replace(/\b\d+\b/g, '')            // çıplak sayılar
        .replace(/[^\p{L}\s]/gu, '')        // geriye kalan noktalama
        .replace(/doğumgünü/g, 'doğum günü')
        .replace(/\s+/g, ' ')
        .trim();

      if (!baslik) baslik = 'Hatırlatma';
      baslik = basHarf(baslik);

      var etkinlik = {
        baslik: baslik,
        aciklama: 'Sesli Komut ile oluşturuldu: "' + slot.metin + '"',
        baslangic: ne,
        dakika: 60,
        uyariDakika: pay
      };
      var ics = act.icsUret([etkinlik]);

      return {
        baslik: baslik,
        satirlar: [
          { etiket: 'Tarih', deger: nlp.tarihYaz(ne) },
          { etiket: 'Saat', deger: nlp.saatYaz(ne) + (slot.saat ? '' : ' (varsayılan)') },
          { etiket: 'Uyarı', deger: nlp.sureYaz(pay) }
        ],
        soyle: nlp.tarihYaz(ne) + ' için hatırlatma hazır.',
        aciklama: 'Takvime eklendiğinde uygulama kapalıyken de alarm çalar.',
        aksiyonlar: [
          {
            etiket: '📅 Takvime ekle',
            tip: 'islev',
            birincil: true,
            islev: function () { act.icsIndir(ics, 'hatirlatma'); }
          },
          {
            etiket: 'Google Takvim',
            tip: 'link',
            href: act.googleTakvimLinki(etkinlik)
          }
        ]
      };
    }
  });

  /* 6) Tarayıcının yapamayacağı istekler.
        Kayıtlarda "el fenerini aç", "telefon rehberini buraya indir" gibi istekler
        sessizce "anlamadım"a düşüyordu. Anlamadığımız için değil, tarayıcının
        telefonun donanımına erişememesi yüzünden olmuyor — bunu açıkça söylemek
        kullanıcının aynı komutu tekrar tekrar denemesini önlüyor. */
  var YAPILAMAZ = [
    {
      desen: /el feneri|el fener|fener[iı]? a[cç]|fla[sş] a[cç]/,
      baslik: 'El fenerini açamıyorum',
      aciklama: 'Tarayıcı telefonun flaşına erişemiyor — bu iOS ve Android\'de aynı. ' +
        'Kilit ekranını yukarı kaydırıp Denetim Merkezi\'nden açabilirsin. ' +
        'Uygulamanın bunu yapabilmesi için planın 4. aşaması gerekiyor.',
      soyle: 'El fenerini açamıyorum.'
    },
    {
      // Araya kelime girebiliyor: "rehberini buraya indir"
      desen: /(rehber|ki[sş]iler)\S*(\s+\S+){0,3}\s+(indir|aktar|oku|[cç]ek|al)\S*/,
      baslik: 'Telefonun rehberini okuyamıyorum',
      aciklama: 'Bir web uygulaması telefonun kendi rehberine erişemez; bu bir izin ' +
        'meselesi değil, tarayıcının sınırı. Aramak istediğin kişileri Rehber ' +
        'sekmesinden bir kez tanıtman yeterli, sonra hep hatırlar.',
      soyle: 'Telefonun rehberini okuyamıyorum.',
      rehbereGit: true
    },
    {
      desen: /wifi|wi-fi|bluetooth|u[cç]ak modu|mobil veri/,
      baslik: 'Telefon ayarlarını değiştiremiyorum',
      aciklama: 'Wi-Fi, Bluetooth ve benzeri ayarlar tarayıcıya kapalı. ' +
        'Denetim Merkezi\'nden yapman gerekiyor.',
      soyle: 'Telefon ayarlarını değiştiremiyorum.'
    },
    {
      desen: /ekran g[oö]r[uü]nt[uü]s[uü]|sesi (a[cç]|k[iı]s|art[iı]r|azalt)|parlakl[iı][gğ][iı]/,
      baslik: 'Bunu telefonun kendisi yapabilir, ben yapamam',
      aciklama: 'Ekran görüntüsü, ses ve parlaklık tarayıcının erişebildiği şeyler değil.',
      soyle: 'Bunu yapamıyorum.'
    }
  ];

  KOMUTLAR.push({
    id: 'yapilamaz',
    ad: 'Tarayıcının yapamadığı istek',
    ornekler: ['el fenerini aç', 'telefon rehberini indir'],
    eslesir: function (metin) {
      var t = nlp.normalize(metin);
      for (var i = 0; i < YAPILAMAZ.length; i++) {
        if (YAPILAMAZ[i].desen.test(t)) return { kayit: YAPILAMAZ[i] };
      }
      return null;
    },
    calistir: function (slot, ctx) {
      var k = slot.kayit;
      var kart = {
        baslik: k.baslik,
        uyari: true,
        aciklama: k.aciklama,
        soyle: k.soyle,
        aksiyonlar: []
      };
      if (k.rehbereGit) {
        kart.aksiyonlar.push({
          etiket: '➕ Rehbere kişi ekle',
          tip: 'islev',
          birincil: true,
          islev: function () { ctx.rehberEkleFormu(''); }
        });
      }
      return kart;
    }
  });

  /* 7) Bilgi soruları — henüz cevaplayamıyoruz (Aşama 3: yapay zeka bağlantısı).
        Şimdilik dürüstçe söylüyor ve geçici olarak web aramasına yönlendiriyor. */
  KOMUTLAR.push({
    id: 'bilgi',
    ad: 'Bilgi sorusu',
    ornekler: ['fenerbahçe maçının sonucunu söyle', 'kastamonu evlerini anlat'],
    eslesir: function (metin) {
      var t = nlp.normalize(metin);
      if (/anlat|nedir|kimdir|ne demek|sonuc|sonuç|söyle|soyle|kaç|kac|ne kadar|hava nasıl|hava nasil|haber/.test(t)) {
        return { soru: metin };
      }
      return null;
    },
    calistir: function (slot) {
      // Kaydı motor zaten tutuyor (tür: bilgi). Burada ayrıca istekKaydet çağırmak
      // aynı soruyu Kayıtlar'a ikinci kez, "anlaşılmadı" diye düşürüyordu.
      return {
        baslik: 'Bunu henüz kendim cevaplayamıyorum',
        uyari: true,
        satirlar: [{ etiket: 'Sorduğun', deger: slot.soru }],
        soyle: 'Bu soruyu henüz cevaplayamıyorum, ama isteğini kaydettim.',
        aciklama: 'Bilgi ve güncel veri soruları yapay zeka bağlantısı gerektiriyor (planın 3. aşaması). Şimdilik aramayı senin için açabilirim.',
        aksiyonlar: [{
          etiket: '🔎 İnternette ara',
          tip: 'link',
          href: 'https://www.google.com/search?q=' + encodeURIComponent(slot.soru)
        }]
      };
    }
  });

  /* ---------------------------------------------------------------- */

  /* Motor: komutları sırayla dener, ilk eşleşeni çalıştırır. */
  function calistir(metin, ctx) {
    if (!metin || !nlp.normalize(metin)) return null;
    for (var i = 0; i < KOMUTLAR.length; i++) {
      var k = KOMUTLAR[i];
      var slot = null;
      try {
        slot = k.eslesir(metin);
      } catch (e) {
        console.error('Komut eşleşme hatası: ' + k.id, e);
        continue;
      }
      if (!slot) continue;
      try {
        var kart = k.calistir(slot, ctx);
        if (kart) { kart.komutId = k.id; kart.komutAdi = k.ad; return kart; }
      } catch (e2) {
        console.error('Komut çalışma hatası: ' + k.id, e2);
      }
    }
    return null;
  }

  SK.komutlar = { liste: KOMUTLAR, calistir: calistir };
})(window.SK);
