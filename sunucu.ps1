# sunucu.ps1 — Uygulamayı localhost üzerinden yayınlar.
#
# Neden gerekli: tarayıcılar mikrofonu yalnızca "güvenli" adreslerde açar.
# Dosyayı çift tıklayıp file:// ile açarsan mikrofon çalışmaz; localhost çalışır.
# Python/Node kurulumuna gerek kalmasın diye sunucu doğrudan .NET soketiyle yazıldı.
#
# Durdurmak için: bu pencerede Ctrl+C

$port = 8080
$kok  = $PSScriptRoot

$icerikTurleri = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.ics'  = 'text/calendar; charset=utf-8'
}

$dinleyici = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $port)

try {
  $dinleyici.Start()
} catch {
  Write-Host "HATA: $port portu kullanimda olabilir. Baska bir program kapatilip tekrar denenmeli." -ForegroundColor Red
  Write-Host $_.Exception.Message
  exit 1
}

Write-Host ""
Write-Host "  Sesli Komut calisiyor" -ForegroundColor Green
Write-Host "  Tarayicida ac:  http://localhost:$port" -ForegroundColor Cyan
Write-Host "  Durdurmak icin: Ctrl+C"
Write-Host ""

function Send-Yanit {
  param($akis, [int]$kod, [string]$durum, [string]$tur, [byte[]]$govde)

  $basliklar = "HTTP/1.1 $kod $durum`r`n" +
               "Content-Type: $tur`r`n" +
               "Content-Length: $($govde.Length)`r`n" +
               "Cache-Control: no-store`r`n" +
               "Connection: close`r`n`r`n"
  $bas = [System.Text.Encoding]::ASCII.GetBytes($basliklar)
  $akis.Write($bas, 0, $bas.Length)
  if ($govde.Length -gt 0) { $akis.Write($govde, 0, $govde.Length) }
  $akis.Flush()
}

try {
  while ($true) {
    $istemci = $dinleyici.AcceptTcpClient()
    try {
      $akis = $istemci.GetStream()
      $akis.ReadTimeout = 5000

      $tampon = New-Object byte[] 8192
      $okunan = $akis.Read($tampon, 0, $tampon.Length)
      if ($okunan -le 0) { continue }

      $istek = [System.Text.Encoding]::ASCII.GetString($tampon, 0, $okunan)
      $ilkSatir = ($istek -split "`r`n")[0]
      $parcalar = $ilkSatir -split ' '
      if ($parcalar.Count -lt 2) { continue }

      $yol = $parcalar[1] -replace '\?.*$', ''
      $yol = [System.Uri]::UnescapeDataString($yol)
      if ($yol -eq '/') { $yol = '/index.html' }

      # Dizin disina cikma girisimlerini engelle
      $goreli = $yol.TrimStart('/') -replace '/', '\'
      $tamYol = Join-Path $kok $goreli
      $cozulen = [System.IO.Path]::GetFullPath($tamYol)

      if (-not $cozulen.StartsWith([System.IO.Path]::GetFullPath($kok), [System.StringComparison]::OrdinalIgnoreCase)) {
        Send-Yanit $akis 403 'Forbidden' 'text/plain; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes('Yasak'))
        Write-Host "403  $yol" -ForegroundColor Red
        continue
      }

      if (Test-Path -LiteralPath $cozulen -PathType Leaf) {
        $uzanti = [System.IO.Path]::GetExtension($cozulen).ToLower()
        $tur = $icerikTurleri[$uzanti]
        if (-not $tur) { $tur = 'application/octet-stream' }
        $veri = [System.IO.File]::ReadAllBytes($cozulen)
        Send-Yanit $akis 200 'OK' $tur $veri
        Write-Host "200  $yol" -ForegroundColor DarkGray
      } else {
        Send-Yanit $akis 404 'Not Found' 'text/plain; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes('Bulunamadi'))
        Write-Host "404  $yol" -ForegroundColor Yellow
      }
    } catch {
      Write-Host "Istek hatasi: $($_.Exception.Message)" -ForegroundColor DarkYellow
    } finally {
      $istemci.Close()
    }
  }
} finally {
  $dinleyici.Stop()
  Write-Host "Sunucu durduruldu."
}
