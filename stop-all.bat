@echo off
title AURORA CINEMA - STOP ALL SYSTEMS
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\stop-all.ps1"
