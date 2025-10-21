@echo off

echo Checking for GPU support...
docker info | findstr /C:"nvidia" >nul
if %errorlevel%==0 (
    echo GPU support detected. Starting with GPU profile...
    docker-compose --profile gpu up -d
) else (
    echo No GPU support detected. Starting with CPU profile...
    docker-compose --profile default up -d
)
pause