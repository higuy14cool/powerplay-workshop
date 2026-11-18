@echo off
cd /d "%~dp0"
where py >nul 2>nul && (py start.py & goto :end)
where python >nul 2>nul && (python start.py & goto :end)
echo Python 3 is not installed. Install it from python.org, then run this file again.
pause
:end
