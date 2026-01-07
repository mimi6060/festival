# Festival AI Service - Multi-stage Dockerfile
# Python 3.11 with ML dependencies

# Pin base image to SHA256 digest for reproducible builds
ARG PYTHON_IMAGE=python:3.11-slim@sha256:8868a8ce46300fe1038a2a9eb3ff740db8866b0cb30bf124379f2d3605d037ab

# =============================================================================
# Stage 1: Builder
# =============================================================================
FROM ${PYTHON_IMAGE} as builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
WORKDIR /build
COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel && \
    pip install -r requirements.txt

# =============================================================================
# Stage 2: Production
# =============================================================================
FROM ${PYTHON_IMAGE} as production

# Labels
LABEL org.opencontainers.image.title="Festival AI Service"
LABEL org.opencontainers.image.description="AI/ML Service for Festival Management Platform"
LABEL org.opencontainers.image.version="1.0.0"

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PATH="/opt/venv/bin:$PATH" \
    # App settings
    APP_HOME=/app \
    APP_USER=appuser \
    APP_GROUP=appgroup

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user
RUN groupadd --gid 1000 ${APP_GROUP} && \
    useradd --uid 1000 --gid ${APP_GROUP} --shell /bin/bash --create-home ${APP_USER}

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Set working directory
WORKDIR ${APP_HOME}

# Create directories for models and data
RUN mkdir -p ${APP_HOME}/models ${APP_HOME}/data ${APP_HOME}/logs && \
    chown -R ${APP_USER}:${APP_GROUP} ${APP_HOME}

# Copy application code
COPY --chown=${APP_USER}:${APP_GROUP} . .

# Switch to non-root user
USER ${APP_USER}

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run application
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]

# =============================================================================
# Stage 3: Development
# =============================================================================
FROM production as development

# Switch to root for dev tools installation
USER root

# Install dev dependencies
RUN pip install pytest pytest-asyncio pytest-cov pytest-mock black isort mypy ruff

# Switch back to app user
USER ${APP_USER}

# Enable hot reload
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
