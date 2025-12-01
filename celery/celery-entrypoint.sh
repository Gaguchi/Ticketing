#!/bin/bash
set -e

echo "========================================"
echo "Starting Celery Services"
echo "========================================"

# Wait for database to be ready
echo "Waiting for database..."
while ! nc -z ${DB_HOST:-localhost} ${DB_PORT:-5432}; do
  echo "Database is unavailable - sleeping"
  sleep 1
done
echo "✅ Database is up!"

# Wait for Redis to be ready
echo "Waiting for Redis..."
while ! nc -z ${REDIS_HOST:-localhost} ${REDIS_PORT:-6379}; do
  echo "Redis is unavailable - sleeping"
  sleep 1
done
echo "✅ Redis is up!"

# Run migrations (in case backend hasn't run yet)
echo "Running migrations..."
python manage.py migrate --noinput || echo "Migration skipped"

# Start Celery beat in background
echo "Starting Celery beat scheduler..."
celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler &

# Give beat a moment to start
sleep 2

# Start Celery worker in foreground
echo "Starting Celery worker..."
celery -A config worker --loglevel=info
