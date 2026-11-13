@echo off
title Opti ITAM - Cliente Local (DB en Raspberry Pi)
cd /d "%~dp0"
echo Iniciando Opti ITAM conectado a 192.168.16.132:8080...
echo Abre en tu navegador: http://localhost:8080
python client_windows.py
pause
