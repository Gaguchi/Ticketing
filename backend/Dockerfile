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

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Make entrypoint executable (celery scripts are optional for main backend)
RUN chmod +x entrypoint.sh && \
    (chmod +x celery-worker.sh celery-beat.sh 2>/dev/null || true)

# Create static files directory
RUN mkdir -p /app/staticfiles

# Expose port for Daphne (ASGI server for WebSockets)
EXPOSE 8000

# Run with Daphne for WebSocket support
# Dokploy will override this with the entrypoint.sh script
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
