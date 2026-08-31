# Telefona taşıma (Aşama 2)

Amaç: uygulamayı bir **https** adresine koymak. Mikrofon yalnızca https veya
localhost'ta açılır — bu yüzden telefonda test etmenin başka yolu yok.

Seçilen yer: **GitHub Pages** (ücretsiz, kalıcı, kendi adresin).
Bilgisayarda git kurulu değil, o yüzden aşağıdaki adımlar tamamen tarayıcıdan yapılır.

---

## 1. GitHub hesabı

https://github.com → **Sign up**. Hesabın varsa **Sign in**.
Seçtiğin kullanıcı adı adreste görünecek: `https://KULLANICIADIN.github.io/sesli-komut/`

## 2. Depo (repository) aç

1. Sağ üstteki **+** → **New repository**
2. **Repository name:** `sesli-komut`
3. **Public** seçili olsun — ücretsiz hesapta Pages yalnızca public depolarda çalışır
4. Başka hiçbir kutuyu işaretleme (README ekleme), **Create repository**

> Public olması bir sorun değil: rehberdeki kişiler ve kayıtlar depoya **girmiyor**,
> onlar yalnızca telefonun kendi tarayıcı deposunda duruyor. Yüklenen şey sadece kod.

## 3. Dosyaları yükle

1. Açılan sayfada **uploading an existing file** bağlantısına tıkla
2. Windows'ta `C:\Users\pc\Downloads\test claude\sesli-komut` klasörünü aç
3. **Klasörün içindekilerin hepsini seç** (Ctrl+A) ve tarayıcıdaki alana sürükle

   ⚠️ Klasörün kendisini değil, **içindekileri** sürükle. Klasörü sürüklersen adres
   `.../sesli-komut/sesli-komut/` gibi bir kat fazla olur.

4. Alttaki yeşil **Commit changes** düğmesine bas

Yüklenmesi gerekenler: `index.html`, `manifest.json`, `css/`, `js/`, `simge/`,
`test.html`, `README.md`, `YAYINLAMA.md`. `BASLAT.bat` ve `sunucu.ps1` de kalsın —
bilgisayarda çalışmaya devam etmek için lazımlar, sitede zararsız dururlar.

`.nojekyll` dosyası gizli olduğu için Explorer'da görünmeyebilir; önemli değil,
bu projede olmadan da çalışır. Yine de eklemek istersen: depoda
**Add file → Create new file** → ada `.nojekyll` yaz → **Commit changes**.

## 4. Pages'i aç

1. Depoda **Settings** sekmesi
2. Sol menüde **Pages**
3. **Source:** `Deploy from a branch`
4. **Branch:** `main`, klasör `/ (root)` → **Save**
5. 1–2 dakika bekle, sayfayı yenile. Üstte adresin çıkacak:
   `https://KULLANICIADIN.github.io/sesli-komut/`

## 5. Telefonda test

Adresi telefonda aç — **iPhone'da Safari ile** (ana ekrana ekleme en sağlıklı orada çalışır).

**Ana ekrana ekle:** Paylaş düğmesi → *Ana Ekrana Ekle*. Simge ve tam ekran görünüm
hazır; uygulama tarayıcı çubuğu olmadan açılır.

### Kontrol listesi

Sırayla dene, çalışmayanı not al:

- [ ] Sayfa açılıyor, üstteki rozette **iPhone / iPad** yazıyor
- [ ] Mikrofon düğmesine basınca izin soruyor, izin verince dinliyor
- [ ] Türkçe konuşma doğru yazıya çevriliyor
- [ ] **Rehber** sekmesine bir kişi ekle → "oğlumu ara" → onay kartı çıkıyor → arama başlıyor
- [ ] "youtube uygulamamdan ... aç" → YouTube uygulaması açılıyor
- [ ] "10 gün sonra doktor randevum var, bir gün önceden hatırlat" → `.ics` indiyor
      ve **Takvim'e ekleniyor** ← burası iOS'ta en riskli adım
- [ ] `.ics` sorun çıkarırsa **Google Takvim** yedek düğmesi çalışıyor
- [ ] Ana ekrana ekledikten sonra açınca mikrofon **hâlâ** çalışıyor
      (tam ekran modunda izin yeniden sorulabilir)

Sonuçları ve **Kayıtlar → Kayıtları kopyala** çıktısını bana ver; anlaşılmayan
komutları ve telefonda kırılan yerleri ona göre düzeltiriz.

## Sonradan değişiklik yapmak

Bilgisayarda dosyayı değiştir → depoda o dosyaya tıkla → kalem simgesi → içeriği
yapıştır → **Commit changes**. Yayına girmesi ~1 dakika sürer.

Telefonda eski sürüm görünüyorsa sayfayı yenile; ana ekrana eklenmiş uygulamada
kapatıp yeniden açmak gerekebilir.
