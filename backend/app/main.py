from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.controllers.prompt_controller import router as prompt_router
import time


# Create FastAPI application
app = FastAPI(
    title="Prompt Directory Server",
    description="A FastAPI server for managing and serving prompts with variables",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(prompt_router)


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print("🚀 Starting Prompt Directory Server...")
    print("📚 Loading and embedding prompts...")
    
    # The embedding will happen automatically when PromptService is initialized
    # This is handled in the dependency injection
    time.sleep(1)  # Small delay to show the startup message
    print("✅ Server ready!")


@app.get("/")
async def root():
    """Root endpoint with basic information"""
    return {
        "message": "Welcome to Prompt Directory Server",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "prompts": "/api/prompts",
            "health": "/health"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "prompt-directory-server"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 