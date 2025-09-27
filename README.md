# NexGuard - AI-Powered Surveillance System

A real-time object detection and surveillance system built with FastAPI, WebRTC, and YOLO models.

## Features

- **Real-time Video Streaming**: WebRTC-based camera streaming with low latency
- **Multi-Camera Support**: Manage multiple cameras simultaneously
- **AI Object Detection**: YOLO model integration for real-time detection
- **RESTful API**: Comprehensive API for camera management and inference
- **Web Interface**: Angular frontend for live camera feeds
- **Scalable Architecture**: Modular design for easy extension

## Architecture

```
NexGuard/
├── pyproject.toml           # Project configuration and dependencies
├── .env                     # Environment variables (create from template)
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes and endpoints
│   │   ├── services/       # Business logic services
│   │   ├── models/         # Data models
│   │   ├── core/           # Core functionality (database, etc.)
│   │   ├── alembic/        # Database migrations
│   │   └── main.py         # FastAPI application
│   └── requirements.txt     # Legacy requirements (use pyproject.toml)
├── scripts/                 # Project management scripts
│   ├── manage.py           # Unified project manager
│   ├── setup_project.py    # Project setup script
│   ├── run_server.py       # Development server
│   ├── config_manager.py   # Configuration management
│   └── migrate.py          # Database migration manager
├── frontend/               # Angular frontend
├── models/                 # ML model files (.pt, .onnx)
├── data/                   # Application data
│   ├── storage/           # Media files (images, videos)
│   └── database/          # Database files
├── docs/                   # Documentation
├── tests/                  # Test files
└── logs/                   # Application logs
```

## Quick Start

### Automated Setup (Recommended)

1. **Quick setup with the project manager:**
```bash
# Setup project with development dependencies
python scripts/manage.py setup --dev

# Start the development server
python scripts/manage.py server
```

### Manual Setup

1. **Create and activate a virtual environment:**
```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
# or
source .venv/bin/activate  # Linux/Mac
```

2. **Install the project:**
```bash
# Install base dependencies
pip install -e .

# Or install with development dependencies
pip install -e ".[dev]"

# Or install with GPU support
pip install -e ".[gpu]"

# Or install everything
pip install -e ".[all]"
```

3. **Configure the project:**
```bash
# Generate configuration template
python scripts/manage.py config template

# Edit the .env file with your settings
# Then validate the configuration
python scripts/manage.py config validate
```

4. **Initialize the database:**
```bash
python scripts/manage.py migrate upgrade
```

5. **Start the development server:**
```bash
python scripts/manage.py server
# or
python -m uvicorn backend.app.main:app --reload
```

The API will be available at `http://localhost:8000` with interactive docs at `http://localhost:8000/docs`.

### Frontend Setup

```bash
cd frontend/nexguard
npm install
ng serve
```

The frontend will be available at `http://localhost:4200`.

## API Endpoints

- **GET /api/cameras** - List all cameras
- **POST /api/cameras/add** - Add a new camera
- **POST /api/cameras/{id}/start** - Start camera streaming
- **POST /api/cameras/{id}/stop** - Stop camera streaming
- **WebSocket /api/cameras/{id}/webrtc** - WebRTC signaling for real-time streaming

## WebRTC Testing

Open `tests/test-webrtc.html` in your browser to test WebRTC camera streaming functionality.

## Technologies Used

- **Backend**: FastAPI, aiortc, OpenCV, asyncio, SQLAlchemy, Alembic
- **Frontend**: Angular, WebRTC, TypeScript
- **AI/ML**: YOLO models, Ultralytics
- **Streaming**: WebRTC, WebSockets
- **Database**: SQLite (development), PostgreSQL (production)
- **Configuration**: pyproject.toml, python-dotenv
- **Code Quality**: Black, isort, Ruff, MyPy, pre-commit

## Project Management

NexGuard uses a modern Python project structure with `pyproject.toml` for configuration and dependency management.

### Configuration Management

```bash
# Show current configuration
python scripts/manage.py config show

# Show specific section
python scripts/manage.py config show --section detection

# Set environment variable
python scripts/manage.py config set DATABASE_URL "sqlite:///./data/nexguard.db"

# Generate .env template
python scripts/manage.py config template

# Validate configuration
python scripts/manage.py config validate
```

### Database Migrations

```bash
# Initialize Alembic (first time only)
python scripts/manage.py migrate init

# Create a new migration
python scripts/manage.py migrate create "Add new feature"

# Apply migrations
python scripts/manage.py migrate upgrade

# Check migration status
python scripts/manage.py migrate status

# Show migration history
python scripts/manage.py migrate history
```

### Development Server

```bash
# Start development server with default settings
python scripts/manage.py server

# Start with custom settings
python scripts/manage.py server --host localhost --port 8080 --log-level debug

# Skip startup checks for faster development
python scripts/manage.py server --skip-checks
```

### Installation Options

```bash
# Development installation with all dev tools
pip install -e ".[dev]"

# Production installation with monitoring tools
pip install -e ".[production]"

# GPU-accelerated installation
pip install -e ".[gpu]"

# Everything (dev + production + gpu)
pip install -e ".[all]"
```

The project follows Python PEP 8 and Angular style guidelines.

## Development

### Code Quality Tools

The project includes pre-configured code quality tools:

```bash
# Format code with Black
black backend/ scripts/


# Lint with Ruff (modern replacement for flake8)
ruff check backend/ scripts/

# Type checking with MyPy
mypy backend/

# Run all pre-commit hooks
pre-commit run --all-files
```

### Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=backend --cov-report=html

# Run specific test categories
pytest -m unit          # Unit tests only
pytest -m integration   # Integration tests only
pytest -m "not slow"    # Skip slow tests
```

### Project Structure

```
NexGuard/
├── pyproject.toml           # Project configuration and dependencies
├── .env                     # Environment variables (create from template)
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes and endpoints
│   │   ├── services/       # Business logic services
│   │   ├── models/         # Data models
│   │   ├── core/           # Core functionality (database, etc.)
│   │   ├── alembic/        # Database migrations
│   │   └── main.py         # FastAPI application
│   └── requirements.txt     # Legacy requirements (use pyproject.toml)
├── scripts/                 # Project management scripts
│   ├── manage.py           # Unified project manager
│   ├── setup_project.py    # Project setup script
│   ├── run_server.py       # Development server
│   ├── config_manager.py   # Configuration management
│   └── migrate.py          # Database migration manager
├── frontend/               # Angular frontend
├── models/                 # ML model files (.pt, .onnx)
├── data/                   # Application data
│   ├── storage/           # Media files (images, videos)
│   └── database/          # Database files
├── docs/                   # Documentation
├── tests/                  # Test files
└── logs/                   # Application logs
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

- Developer: SpherCodes
- Email: Sphersphiwe24@gmail.com

## Roadmap

- [ ] Add database integration
- [ ] Implement user authentication
- [ ] Add motion detection alerts
- [ ] Mobile app development
- [ ] Cloud deployment support
- [ ] Advanced AI analytics
- [ ] Real-time notifications
