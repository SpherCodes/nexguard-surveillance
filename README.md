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
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── api/          # API routes and endpoints
│   │   ├── services/     # Business logic services
│   │   ├── models/       # Data models
│   │   └── main.py       # FastAPI application
│   └── requirements.txt
├── frontend/             # Angular frontend
├── models/               # ML model files
├── scripts/              # Utility scripts
├── docs/                 # Documentation and diagrams
└── tests/                # Test files
```

## Quick Start

### Backend Setup

1. Create and activate a virtual environment:
```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
# or
source .venv/bin/activate  # Linux/Mac
```

2. Install dependencies:
```bash
pip install -r backend/requirements.txt
```

3. Start the API server:
```bash
python run_server.py
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

- **Backend**: FastAPI, aiortc, OpenCV, asyncio
- **Frontend**: Angular, WebRTC, TypeScript
- **AI/ML**: YOLO models, Ultralytics
- **Streaming**: WebRTC, WebSockets
- **Database**: (To be implemented)

## Development

### Running Tests

```bash
# Backend tests
python -m pytest tests/

# Frontend tests
cd frontend/nexguard
ng test
```

### Code Style

The project follows Python PEP 8 and Angular style guidelines.

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
