"""
Festival AI Service - Main Application Entry Point.

FastAPI application with ML/AI capabilities for the Festival Management Platform.
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import make_asgi_app

from src.api.middleware.auth import JWTAuthMiddleware
from src.api.middleware.logging import LoggingMiddleware
from src.api.routes import health, models, predict, train
from src.config import settings
from src.models.registry import model_registry
from src.services.data_service import DataService
from src.services.model_service import ModelService

# =============================================================================
# Logging Configuration
# =============================================================================

def configure_logging() -> None:
    """Configure structured logging with structlog."""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.dev.set_exc_info,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer() if settings.is_development else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            logging.getLevelName(settings.log_level)
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


configure_logging()
logger = structlog.get_logger()


# =============================================================================
# Application Lifespan
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan handler.

    Initializes services on startup and cleans up on shutdown.
    """
    # Startup
    logger.info("Starting Festival AI Service", version="1.0.0", env=settings.app_env)

    # Initialize services
    app.state.data_service = DataService()
    app.state.model_service = ModelService(
        models_path=settings.models_path,
        registry=model_registry,
    )

    # Connect to databases
    await app.state.data_service.connect()
    logger.info("Connected to PostgreSQL and Redis")

    # Load models if auto-load is enabled
    if settings.auto_load_models:
        await app.state.model_service.load_all_models()
        logger.info("Models loaded successfully")

    logger.info(
        "Festival AI Service started successfully",
        host=settings.host,
        port=settings.port,
    )

    yield

    # Shutdown
    logger.info("Shutting down Festival AI Service")

    # Disconnect from databases
    await app.state.data_service.disconnect()

    # Cleanup models
    app.state.model_service.cleanup()

    logger.info("Festival AI Service stopped")


# =============================================================================
# Application Factory
# =============================================================================

def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.

    Returns:
        FastAPI: Configured application instance.
    """
    app = FastAPI(
        title="Festival AI Service",
        description="""
        AI/ML Service for Festival Management Platform.

        ## Features

        - **Prediction**: Get predictions from trained models
        - **Training**: Train new models with festival data
        - **Model Management**: List, load, and manage ML models
        - **Health Checks**: Monitor service health

        ## Authentication

        This API uses JWT authentication shared with the main NestJS backend.
        Include the JWT token in the Authorization header as `Bearer <token>`.
        """,
        version="1.0.0",
        docs_url=f"{settings.api_prefix}/docs",
        redoc_url=f"{settings.api_prefix}/redoc",
        openapi_url=f"{settings.api_prefix}/openapi.json",
        lifespan=lifespan,
    )

    # ==========================================================================
    # Middleware
    # ==========================================================================

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Custom middleware
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(JWTAuthMiddleware)

    # ==========================================================================
    # Exception Handlers
    # ==========================================================================

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """Global exception handler for unhandled exceptions."""
        logger.error(
            "Unhandled exception",
            exc_info=exc,
            path=request.url.path,
            method=request.method,
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "message": str(exc) if settings.debug else "An unexpected error occurred",
                "path": request.url.path,
            },
        )

    # ==========================================================================
    # Routes
    # ==========================================================================

    # Include API routers
    app.include_router(health.router, tags=["Health"])
    app.include_router(
        models.router,
        prefix=f"{settings.api_prefix}/models",
        tags=["Models"]
    )
    app.include_router(
        predict.router,
        prefix=f"{settings.api_prefix}/predict",
        tags=["Prediction"]
    )
    app.include_router(
        train.router,
        prefix=f"{settings.api_prefix}/train",
        tags=["Training"]
    )

    # Prometheus metrics endpoint
    if settings.prometheus_enabled:
        metrics_app = make_asgi_app()
        app.mount("/metrics", metrics_app)

    # ==========================================================================
    # Root Endpoint
    # ==========================================================================

    @app.get("/", include_in_schema=False)
    async def root() -> dict:
        """Root endpoint redirecting to API docs."""
        return {
            "service": "Festival AI Service",
            "version": "1.0.0",
            "docs": f"{settings.api_prefix}/docs",
            "health": "/health",
        }

    return app


# =============================================================================
# Application Instance
# =============================================================================

app = create_app()


# =============================================================================
# CLI Runner
# =============================================================================

def run() -> None:
    """Run the application using uvicorn."""
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        workers=settings.workers,
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    run()
