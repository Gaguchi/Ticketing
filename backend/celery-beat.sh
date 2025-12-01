#!/bin/bash
set -e

echo "========================================"
echo "Starting Celery Beat Scheduler"
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

# Start Celery beat scheduler
echo "Starting Celery beat..."
celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
