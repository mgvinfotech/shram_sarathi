@echo off
setlocal
echo ============================================
echo   Shram Sarathi - Laravel Backend + Admin
echo ============================================
echo.

REM Check PHP
php -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] PHP not found. Install PHP 8.2+ and add to PATH.
    pause & exit /b 1
)

REM Check Composer
composer -V >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Composer not found. Install from https://getcomposer.org
    pause & exit /b 1
)

REM Setup .env
if not exist .env (
    echo [SETUP] Creating .env from .env.example ...
    copy .env.example .env
    echo [SETUP] Generating APP_KEY ...
    php artisan key:generate
    echo.
)

REM Install dependencies
if not exist vendor (
    echo [SETUP] Installing dependencies (this may take a few minutes) ...
    composer install
    echo.
)

REM Clear caches
echo [INFO] Clearing caches ...
php artisan config:clear >nul 2>&1
php artisan cache:clear  >nul 2>&1
php artisan view:clear   >nul 2>&1
php artisan route:clear  >nul 2>&1

REM Run migrations
echo [INFO] Running database migrations ...
php artisan migrate --force
if errorlevel 1 (
    echo [WARN] Migration failed - check DB connection in .env
)

REM Seed admin user
echo [INFO] Seeding admin user ...
php artisan db:seed --class=AdminSeeder --force 2>nul

echo.
echo ============================================
echo   Server starting on http://localhost:8001
echo   Admin Panel : http://localhost:8001/admin
echo   API Base    : http://localhost:8001/api
echo   API Health  : http://localhost:8001/up
echo.
echo   Default Admin Login:
echo     Phone    : 9999999999
echo     Password : admin123
echo     OTP      : 123456 (dev mode)
echo ============================================
echo.

php artisan serve --host=0.0.0.0 --port=8001
