@echo off
chcp 65001 >nul
title تثبيت جنان بيز

echo.
echo  إيقاف البرنامج تمهيداً للتثبيت...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
timeout /t 3 /nobreak >nul

echo  بدء التثبيت...
echo.
start /wait "" "%~dp0jenanbiz.exe"
