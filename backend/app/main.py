# import sys
# import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

# sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the API router (we'll create this)
from .api.router import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting NexGuard API...")
    yield
    print("Stopping NexGuard API...")

app = FastAPI(
    title="NexGuard API",
    description="Real-time object detection and surveillance system",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Welcome to the NexGuard API!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )