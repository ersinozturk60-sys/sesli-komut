@echo off
rem Cift tiklayarak uygulamayi baslatir.
title Sesli Komut - Sunucu
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0sunucu.ps1"
pause
