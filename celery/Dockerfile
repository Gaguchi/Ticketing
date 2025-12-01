# Celery Worker & Beat Service for Ticketing System
#
# This Dockerfile creates a container that runs both Celery worker and beat scheduler.
# It uses the same codebase as the backend but runs Celery instead of Daphne.
#
# IMPORTANT: In Dokploy, set the Build Path to "/" (root) NOT "/celery"
# and set the Dockerfile Path to "celery/Dockerfile"

FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    build-essential \
    libpq-dev \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy and install Python dependencies from backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code
COPY backend/ .

# Create entrypoint script for combined worker + beat
COPY celery/celery-entrypoint.sh /app/celery-entrypoint.sh
RUN chmod +x /app/celery-entrypoint.sh

# Expose no ports - Celery doesn't need external access
# It communicates via Redis

# Health check - verify celery is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD celery -A config inspect ping || exit 1

# Run the combined entrypoint
CMD ["/app/celery-entrypoint.sh"]
