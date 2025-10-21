FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

WORKDIR /app

# Install Python and system dependencies (including OpenCV and ML dependencies)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgstreamer1.0-0 \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    libavformat-dev \
    libavcodec-dev \
    libavdevice-dev \
    libavutil-dev \
    libavfilter-dev \
    libswscale-dev \
    libswresample-dev \
    ffmpeg \
    curl \
    build-essential \
    unixodbc-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Create a symlink for python command
RUN ln -s /usr/bin/python3 /usr/bin/python

# Upgrade pip and install essential tools
RUN python3 -m pip install --upgrade pip setuptools wheel

# Install Microsoft ODBC Driver for SQL Server
# RUN curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - \
#     && curl https://packages.microsoft.com/config/ubuntu/22.04/prod.list > /etc/apt/sources.list.d/mssql-release.list \
#     && apt-get update \
#     && ACCEPT_EULA=Y apt-get install -y msodbcsql18 \
#     && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.docker.txt ./requirements.txt

# Install Python dependencies from requirements file with fallback strategy
# First try to install everything at once, then fallback to critical packages only
RUN pip3 install --no-cache-dir -r requirements.txt --verbose

RUN echo "===VERIFYING CRITICAL PACKAGES===" && \
    python3 - <<'PY'
import importlib
for pkg in ("psycopg2", "sqlalchemy"):
    try:
        module = importlib.import_module(pkg)
        print(f"{pkg} OK, version:", getattr(module, "__version__", "unknown"))
    except ImportError as exc:
        raise SystemExit(f"{pkg} missing: {exc}")
PY

# Copy application code
COPY . .

# Create required directories with proper permissions
RUN mkdir -p /app/storage /app/data /app/data/models \
    && chmod -R 755 /app/storage /app/data

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Use uvicorn directly to avoid gunicorn worker issues
CMD ["python3", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
