@echo off
cd /D %~dp0
call _internal\setenv.bat
"%PYTHONEXECUTABLE%" _internal\main.py run FormGUI
pause
