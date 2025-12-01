#!/bin/bash
set -e

echo "========================================"
echo "Starting Celery Services"
echo "========================================"

# Debug: Print Redis configuration (mask password)
echo "========================================"
echo "Redis Configuration Debug:"
echo "  REDIS_URL set: $(if [ -n "$REDIS_URL" ]; then echo "YES (value masked)"; else echo "NO"; fi)"
echo "  REDIS_HOST: ${REDIS_HOST:-not set}"
echo "  REDIS_PORT: ${REDIS_PORT:-not set}"
echo "  CELERY_BROKER_URL set: $(if [ -n "$CELERY_BROKER_URL" ]; then echo "YES"; else echo "NO"; fi)"
echo "========================================"

# IMPORTANT: If REDIS_URL is set, ensure CELERY_BROKER_URL and CELERY_RESULT_BACKEND use it
# This overrides any defaults in settings.py to ensure auth works
if [ -n "$REDIS_URL" ]; then
  export CELERY_BROKER_URL="${CELERY_BROKER_URL:-$REDIS_URL}"
  export CELERY_RESULT_BACKEND="${CELERY_RESULT_BACKEND:-$REDIS_URL}"
  echo "  Exported CELERY_BROKER_URL from REDIS_URL"
  echo "  Exported CELERY_RESULT_BACKEND from REDIS_URL"
fi
echo "========================================"

# Extract host and port from REDIS_URL if set
if [ -n "$REDIS_URL" ]; then
  # Parse REDIS_URL to get host for health check
  # Format: redis://[user:password@]host:port/db
  REDIS_CHECK_HOST=$(echo "$REDIS_URL" | sed -E 's|redis://([^:]*:)?([^@]*@)?([^:]+):([0-9]+).*|\3|')
  REDIS_CHECK_PORT=$(echo "$REDIS_URL" | sed -E 's|redis://([^:]*:)?([^@]*@)?([^:]+):([0-9]+).*|\4|')
  echo "Extracted Redis host for health check: $REDIS_CHECK_HOST:$REDIS_CHECK_PORT"
else
  REDIS_CHECK_HOST=${REDIS_HOST:-localhost}
  REDIS_CHECK_PORT=${REDIS_PORT:-6379}
fi

# Wait for database to be ready
echo "Waiting for database..."
while ! nc -z ${DB_HOST:-localhost} ${DB_PORT:-5432}; do
  echo "Database is unavailable - sleeping"
  sleep 1
done
echo "✅ Database is up!"

# Wait for Redis to be ready
echo "Waiting for Redis at $REDIS_CHECK_HOST:$REDIS_CHECK_PORT..."
while ! nc -z $REDIS_CHECK_HOST $REDIS_CHECK_PORT; do
  echo "Redis is unavailable - sleeping"
  sleep 1
done
echo "✅ Redis is up!"

# Run migrations (in case backend hasn't run yet)
echo "Running migrations..."
python manage.py migrate --noinput || echo "Migration skipped"

# Start Celery beat in background
echo "Starting Celery beat scheduler..."
celery -A config beat --loglevel=debug --scheduler django_celery_beat.schedulers:DatabaseScheduler &

# Give beat a moment to start
sleep 2

# Start Celery worker in foreground
echo "Starting Celery worker..."
celery -A config worker --loglevel=info
