@echo off
setlocal

REM === _z folder ===
echo Are you sure you want to delete "_z"?
echo This will remove the browser view (preferences and cache).
set /p confirm_z=Delete _z folder? (Y/n) [default: Y]: 
if /i "%confirm_z%"=="n" (
    echo Skipped deleting _z.
) else (
    IF EXIST "_z" (
        echo Deleting folder: _z
        rmdir /s /q "_z"
    ) ELSE (
        echo Folder "_z" not found.
    )
)

echo.

REM === __pycache__ folders ===
echo Are you sure you want to delete all "__pycache__" folders in "backend"?
echo This will delete cached Python scripts.
set /p confirm_pycache=Delete __pycache__ folders? (Y/n) [default: Y]: 
if /i "%confirm_pycache%"=="n" (
    echo Skipped deleting __pycache__ folders.
) else (
    echo Searching and deleting __pycache__ folders...
    for /d /r "backend" %%d in (__pycache__) do (
        if exist "%%d" (
            echo Deleting folder: %%d
            rmdir /s /q "%%d"
        )
    )
)

echo.

REM === temp-last-quote*.html files ===
echo Are you sure you want to delete all "temp-last-quote*.html" files?
echo This will remove all temporary last quote HTML files.
set /p confirm_temp=Delete temp-last-quote*.html files? (Y/n) [default: Y]: 
if /i "%confirm_temp%"=="n" (
    echo Skipped deleting temp-last-quote HTML files.
) else (
    echo Searching and deleting temp-last-quote*.html files...
    for /r %%f in (temp-last-quote*.html) do (
        if exist "%%f" (
            echo Deleting file: %%f
            del /q "%%f"
        )
    )
)

echo.

REM === ajanlatok folder ===
echo !WARNING! !WARNING! !WARNING! !WARNING! !WARNING! !WARNING! !WARNING!
echo You are about to delete the "ajanlatok" folder from the parent directory.
echo This will remove ALL generated PDFs from "ajanlatok".
echo Recommended only before releasing a new version.
set /p confirm_ajanlatok=Delete "..\ajanlatok" folder? (y/N) [default: N]: 
if /i "%confirm_ajanlatok%"=="y" (
    IF EXIST "..\ajanlatok" (
        echo Deleting folder: ..\ajanlatok
        rmdir /s /q "..\ajanlatok"
    ) ELSE (
        echo Folder "..\ajanlatok" not found.
    )
) else (
    echo Skipped deleting ajanlatok folder.
)

echo.
echo Cleanup complete.
pause
