@echo off
title AURORA CINEMA - FULL SYSTEM STARTER
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\start-all.ps1"
