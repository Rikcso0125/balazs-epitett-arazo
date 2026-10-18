@echo off
cd /D %~dp0
call setenv.bat
rmdir %LOCALENV% /s /q
mkdir %LOCALENV%
mkdir %TEMP%
mkdir %USERPROFILE%
mkdir %DESKTOP%
mkdir %LOCALAPPDATA%
mkdir %APPDATA%
