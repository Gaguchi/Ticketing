# Celery Worker & Beat Service for Ticketing System
#
# This Dockerfile creates a container that runs both Celery worker and beat scheduler.
# It clones the backend code from the same repo during build.
#
# Dokploy Settings:
#   - Build Path: /celery
#   - Dockerfile Path: Dockerfile

FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies including git
RUN apt-get update && apt-get install -y \
    postgresql-client \
    build-essential \
    libpq-dev \
    netcat-openbsd \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy requirements (synced copy from backend/requirements.txt)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Clone the backend code from the repo
# ARG allows passing the branch at build time
ARG GIT_BRANCH=main
RUN git clone --depth 1 --branch ${GIT_BRANCH} https://github.com/Gaguchi/Ticketing.git /tmp/repo && \
    cp -r /tmp/repo/backend/* /app/ && \
    rm -rf /tmp/repo

# Copy entrypoint script (this is in the celery/ context)
COPY celery-entrypoint.sh /app/celery-entrypoint.sh
RUN chmod +x /app/celery-entrypoint.sh

# Expose no ports - Celery doesn't need external access

# Health check - verify celery is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD celery -A config inspect ping || exit 1

# Run the combined entrypoint
CMD ["/app/celery-entrypoint.sh"]
