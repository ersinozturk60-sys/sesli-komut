/* actions.js — Komutların gerçek dünyada yaptığı işler.
   Platforma göre değişen her şey burada toplanıyor; commands.js platform bilmez.
   Yeni bir platform (Android native, Tasker köprüsü) eklenince sadece bu dosya büyür. */
window.SK = window.SK || {};
(function (SK) {
  'use strict';

  function platformBul() {
    var ua = navigator.userAgent || '';
    var iOS = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var android = /Android/.test(ua);
    return {
      ios: iOS,
      android: android,
      mobil: iOS || android,
      masaustu: !iOS && !android,
      adi: iOS ? 'iPhone / iPad' : (android ? 'Android' : 'Masaüstü')
    };
  }

  var PLATFORM = platformBul();

  /* --- Telefon numarası --- */

  function numarayiTemizle(ham) {
    var s = String(ham || '').replace(/[^\d+]/g, '');
    if (s.indexOf('+') > 0) s = s.replace(/\+/g, '');
    return s;
  }

  function aramaLinki(numara) {
    return 'tel:' + numarayiTemizle(numara);
  }

  /* --- YouTube --- */

  /* Mobilde önce uygulamayı denemek istiyoruz. iOS'ta youtube:// şeması
     uygulama kuruluysa açılır; kurulu değilse hiçbir şey olmaz, o yüzden
     kısa bir gecikmeden sonra web adresine düşüyoruz. */
  function youtubeAra(sorgu) {
    var q = encodeURIComponent(sorgu);
    var web = 'https://www.youtube.com/results?search_query=' + q;
    var uygulama = 'youtube://results?search_query=' + q;
    return { web: web, uygulama: uygulama, sorgu: sorgu };
  }

  function derinLinkAc(uygulamaUrl, webUrl) {
    if (!PLATFORM.mobil) { window.open(webUrl, '_blank'); return; }
    var dondu = false;
    function gorunurlukDegisti() { if (document.hidden) dondu = true; }
    document.addEventListener('visibilitychange', gorunurlukDegisti);
    window.location.href = uygulamaUrl;
    setTimeout(function () {
      document.removeEventListener('visibilitychange', gorunurlukDegisti);
      if (!dondu && !document.hidden) window.location.href = webUrl;
    }, 1200);
  }

  /* --- Takvim (.ics) ---
     Web uygulaması kendi başına 10 gün sonrasına alarm kuramaz; bu yüzden
     hatırlatmaları telefonun takvimine devrediyoruz. Böylece uygulama kapalıyken
     de çalar, iCloud/Google ile senkron olur, iOS ve Android'de aynı şekilde işler. */

  function icsTarih(d) {
    var p = SK.nlp.ikiHane;
    return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + 'T' +
      p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + 'Z';
  }

  function icsKacir(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;')
      .replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }

  function uid() {
    return 'sk-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '@sesli-komut';
  }

  /* etkinlikler: [{baslik, aciklama, baslangic:Date, dakika, uyariDakika, tekrarGun}] */
  function icsUret(etkinlikler) {
    var satirlar = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Sesli Komut//TR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];
    etkinlikler.forEach(function (e) {
      var bitis = new Date(e.baslangic.getTime() + (e.dakika || 30) * 60000);
      satirlar.push('BEGIN:VEVENT');
      satirlar.push('UID:' + uid());
      satirlar.push('DTSTAMP:' + icsTarih(new Date()));
      satirlar.push('DTSTART:' + icsTarih(e.baslangic));
      satirlar.push('DTEND:' + icsTarih(bitis));
      satirlar.push('SUMMARY:' + icsKacir(e.baslik));
      if (e.aciklama) satirlar.push('DESCRIPTION:' + icsKacir(e.aciklama));
      if (e.tekrarGun && e.tekrarGun > 1) {
        satirlar.push('RRULE:FREQ=DAILY;COUNT=' + e.tekrarGun);
      }
      if (e.uyariDakika !== null && e.uyariDakika !== undefined) {
        satirlar.push('BEGIN:VALARM');
        satirlar.push('ACTION:DISPLAY');
        satirlar.push('DESCRIPTION:' + icsKacir(e.baslik));
        satirlar.push('TRIGGER:-PT' + e.uyariDakika + 'M');
        satirlar.push('END:VALARM');
      }
      satirlar.push('END:VEVENT');
    });
    satirlar.push('END:VCALENDAR');
    return satirlar.join('\r\n');
  }

  function icsIndir(icsMetin, dosyaAdi) {
    var blob = new Blob([icsMetin], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (dosyaAdi || 'hatirlatma') + '.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  /* Google Takvim yedek yolu: .ics indirmenin sorun çıkardığı yerlerde
     (bazı iOS sürümleri) tek etkinlik için tarayıcıdan doğrudan eklenebilir. */
  function googleTakvimLinki(e) {
    var bitis = new Date(e.baslangic.getTime() + (e.dakika || 30) * 60000);
    var p = new URLSearchParams({
      action: 'TEMPLATE',
      text: e.baslik,
      dates: icsTarih(e.baslangic).replace(/[-:]/g, '') + '/' + icsTarih(bitis).replace(/[-:]/g, ''),
      details: e.aciklama || ''
    });
    return 'https://calendar.google.com/calendar/render?' + p.toString();
  }

  /* --- Sesli yanıt --- */

  var seslerYuklendi = false;
  var trSes = null;

  function sesleriHazirla() {
    if (!('speechSynthesis' in window)) return;
    var sesler = window.speechSynthesis.getVoices() || [];
    if (!sesler.length) return;
    seslerYuklendi = true;
    for (var i = 0; i < sesler.length; i++) {
      if ((sesler[i].lang || '').toLowerCase().indexOf('tr') === 0) { trSes = sesler[i]; break; }
    }
  }

  if ('speechSynthesis' in window) {
    sesleriHazirla();
    window.speechSynthesis.onvoiceschanged = sesleriHazirla;
  }

  function konus(metin) {
    if (!('speechSynthesis' in window) || !metin) return;
    try {
      window.speechSynthesis.cancel();
      if (!seslerYuklendi) sesleriHazirla();
      var u = new SpeechSynthesisUtterance(metin);
      u.lang = 'tr-TR';
      if (trSes) u.voice = trSes;
      u.rate = 1;
      window.speechSynthesis.speak(u);
    } catch (e) { /* ses yoksa sessizce geç */ }
  }

  SK.actions = {
    platform: PLATFORM,
    numarayiTemizle: numarayiTemizle,
    aramaLinki: aramaLinki,
    youtubeAra: youtubeAra,
    derinLinkAc: derinLinkAc,
    icsUret: icsUret,
    icsIndir: icsIndir,
    googleTakvimLinki: googleTakvimLinki,
    konus: konus
  };
})(window.SK);
