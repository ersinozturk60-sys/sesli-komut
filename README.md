# Sesli Komut

Türkçe sesli komutlarla çalışan uygulama. Hedef: telefonda (önce iPhone, sonra Android)
konuşarak işlem yapmak.

## Projeye geri dönerken

1. `BASLAT.bat` → tarayıcıda **http://localhost:8080**
2. Claude Code'u **`C:\Users\pc\Downloads\test claude`** klasöründe başlat — proje
   hafızası bu klasöre bağlı, orada açılınca projenin geçmişi hatırlanır.
3. Kaldığımız yer: **Aşama 1 bitti, Aşama 2 yüklemeye hazır.** Dosyalar GitHub
   Pages'e konmak üzere hazırlandı (manifest, simge, ana ekrana ekleme).
   Sıradaki iş: **`YAYINLAMA.md`** adımlarını izleyip depoyu açmak ve telefonda
   test etmek.

## Çalıştırma

`BASLAT.bat` dosyasına çift tıkla, sonra tarayıcıda **http://localhost:8080** adresini aç.

Neden `localhost`: tarayıcılar mikrofonu yalnızca güvenli adreslerde açar.
Dosyayı doğrudan çift tıklayıp `file://` ile açarsan mikrofon çalışmaz.
Ses tanıma için Chrome veya Edge gerekir (Firefox desteklemiyor); komutları
yazarak denemek her tarayıcıda çalışır.

Testler: **http://localhost:8080/test.html**

## Dosya düzeni

| Dosya | Görevi |
|---|---|
| `js/nlp.js` | Türkçe dil katmanı: tarih, saat, sayı, tekrar, isim çözümleme |
| `js/actions.js` | Platforma göre değişen işler: arama, derin link, takvim dosyası, seslendirme |
| `js/commands.js` | Komut motoru ve komut tanımları |
| `js/app.js` | Arayüz, mikrofon, rehber ve kayıt depolama |
| `sunucu.ps1` | Yerel sunucu (Python/Node gerektirmez) |
| `test.html` | Komut motoru ve takvim dosyası testleri |
| `manifest.json`, `simge/` | Ana ekrana eklendiğinde uygulama gibi açılması için |
| `YAYINLAMA.md` | GitHub Pages'e yükleme ve telefon test adımları |

Yeni komut eklemek için `js/commands.js` içindeki listeye bir nesne eklemek yeterli;
arayüz ve ses katmanı değişmez.

## Şu an çalışan komutlar

- `oğlumu ara` — Rehber sekmesinde tanıtılan kişiyi arar
- `youtube uygulamamdan türk sanat müziği şarkıları aç`
- `10 gün sonra doktor randevum var, bana bir gün önceden hatırlat`
- `şu ilacı 1 hafta sabah ve akşamları 12 saat arayla içmem lazım hatırlat`
- `yarın saat 10:00'a alarm kur` — alarm istekleri takvim hatırlatmasına düşer
- Bilgi soruları (maç sonucu, tarihçe vb.) tanınır ama henüz cevaplanmaz — 3. aşama
- `el fenerini aç`, `telefon rehberini indir` gibi tarayıcının yapamayacağı
  istekler sessizce "anlamadım"a düşmez; nedenini açıklayan bir kart gösterir

## Tasarım kararları

**Her komut önce onay kartı gösterir, iş butona basınca yapılır.** Ses tanıma
hiçbir zaman kusursuz değil; yanlış anlaşılan bir komutun sessizce telefon araması
başlatmaması için hiçbir şey sorulmadan yapılmıyor.

**Hatırlatmalar telefonun takvimine devrediliyor (.ics dosyası).** Bir web
uygulaması 10 gün sonrasına kendi başına alarm kuramaz. Takvime aktarıldığında
alarm uygulama kapalıyken de çalar, iCloud/Google ile senkron olur ve aynı yöntem
hem iOS'ta hem Android'de çalışır.

**Rehber uygulama içinde tutuluyor.** Telefonun kendi rehberini bir web uygulaması
okuyamaz (iOS ve Android'de aynı). Kişiler günlük konuşmadaki adlarıyla kaydedilir
("oğlum", "annem"), çünkü komutta o ad söylenecek.

**Anlaşılmayan komutlar kaydediliyor.** Kayıtlar sekmesi, sıradaki sürümde hangi
komutların eklenmesi gerektiğini gösteren asıl kaynak.

## Yol haritası

1. **Bitti** — Komut motoru iskeleti, 4 çalışan komut, bilgisayarda test
2. **Bitti** — Telefona taşıma: GitHub Pages'te yayında, iPhone'da ana ekrana
   eklenip test edildi, komutların hepsi gerçek cihazda çalışıyor → `YAYINLAMA.md`
3. Serbest konuşma anlama: Claude API ile niyet çözümleme (küçük bir sunucu gerekir,
   API anahtarı telefonda açıkta duramaz) — bilgi soruları da burada devreye girer
4. Derin telefon kontrolü: Android'de native uygulama veya Tasker/HTTP köprüsü;
   iOS'ta Apple Kısayollar üzerinden

## Bilinen sınırlar

- iOS arka planda mikrofon dinlemeye izin vermez — "Hey ..." ile uyandırma mümkün değil, bas-konuş çalışır
- Ses tanıma internet bağlantısı ister (tarayıcının motoru sunucu tarafında çalışıyor)
- iOS'ta `.ics` dosyası indirildikten sonra Takvim'e eklemek bir dokunuş daha isteyebilir;
  gerçek cihaz testinde ölçülecek (Google Takvim yedek butonu bu yüzden var)
