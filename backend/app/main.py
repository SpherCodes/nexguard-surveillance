# import sys
# import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
from pathlib import Path
import subprocess
import os

from .core.database import Base, engine, sessionLocal

# Import the API router
from .api.router import api_router

def setup_directories():
    """Create necessary directories for the application"""
    base_dir = Path("data")
    storage_dir = base_dir / "storage"
    database_dir = base_dir / "database"
    
    # Create main directories
    base_dir.mkdir(exist_ok=True)
    storage_dir.mkdir(exist_ok=True)
    database_dir.mkdir(exist_ok=True)
    
    # Create storage structure - simplified without raw/annotated separation
    (storage_dir / "images").mkdir(parents=True, exist_ok=True)
    (storage_dir / "videos").mkdir(parents=True, exist_ok=True)
    (storage_dir / "thumbnails").mkdir(parents=True, exist_ok=True)
    
    print("Directory structure created successfully!")

def setup_database():
    """Setup database and apply migrations automatically"""
    try:
        # Ensure database directory exists
        db_dir = Path("data/database")
        db_dir.mkdir(parents=True, exist_ok=True)
        
        # Check if database file exists
        db_path = db_dir / "nexguard.db"
        
        if not db_path.exists():
            print("Database file not found. Applying migrations...")
            
            # Change to alembic directory
            alembic_dir = Path(__file__).parent / "alembic"
            original_dir = os.getcwd()
            
            try:
                os.chdir(str(alembic_dir.parent))
                
                # Run alembic upgrade
                result = subprocess.run([
                    "alembic", "upgrade", "head"
                ], capture_output=True, text=True, check=True)
                
                print("✅ Database migrations applied successfully")
                
            except subprocess.CalledProcessError as e:
                print(f"❌ Error applying migrations: {e}")
                print(f"stdout: {e.stdout}")
                print(f"stderr: {e.stderr}")
                raise
            finally:
                os.chdir(original_dir)
        
        else:
            print("Database file exists. Checking for pending migrations...")
            # Optionally check for pending migrations here
            
    except Exception as e:
        print(f"Database setup error: {e}")
        raise

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting NexGuard API...")
    
    # Setup directories first
    setup_directories()
    
    # Setup database and apply migrations
    setup_database()
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")
    
    yield
    
    print("Shutting down NexGuard API...")
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