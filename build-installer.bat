@echo off
chcp 65001 >nul
title بناء مثبّت جنان بيز
color 0B

echo.
echo  =====================================================
echo       جنان بيز - بناء المثبّت الاحترافي
echo  =====================================================
echo.

set ISCC="C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
set ISS=%~dp0jenanbiz-setup.iss

REM --- تحويل الشعار إلى ICO ---
echo [1/3] تجهيز أيقونة الشعار...
set ICO=%~dp0logo.ico
powershell -Command "Add-Type -AssemblyName System.Drawing; $src='%~dp0frontend\public\logo.jpeg'; if(!(Test-Path $src)){$src='%~dp0شعار جنان بيز.jpeg'}; $img=[System.Drawing.Image]::FromFile($src); $bmp=New-Object System.Drawing.Bitmap($img,64,64); $ico=[System.Drawing.Icon]::FromHandle($bmp.GetHicon()); $fs=[System.IO.File]::OpenWrite('%ICO%'); $ico.Save($fs); $fs.Close(); $img.Dispose()" >nul 2>&1
if exist "%ICO%" (echo [OK] تم إنشاء الأيقونة.) else (echo [!] تعذّر إنشاء الأيقونة، سيُستخدم الشعار الافتراضي.)

REM --- تحقق من Inno Setup ---
echo.
echo [2/3] التحقق من Inno Setup...
if not exist %ISCC% (
    echo [!] Inno Setup غير مثبّت.
    echo.
    echo  سيتم فتح صفحة التحميل...
    echo  بعد التثبيت، شغّل هذا الملف مجدداً.
    start https://jrsoftware.org/isdl.php
    pause
    exit /b 1
)
echo [OK] Inno Setup موجود.

REM --- بناء المثبّت ---
echo.
echo [3/3] بناء المثبّت...
%ISCC% "%ISS%"
if %errorlevel% neq 0 (
    echo.
    echo [!] فشل بناء المثبّت، راجع الأخطاء أعلاه.
    pause
    exit /b 1
)

echo.
echo  =====================================================
echo   تم بناء المثبّت بنجاح!
echo   الملف: JananBiz-Setup-v2.exe
echo  =====================================================
echo.
pause
