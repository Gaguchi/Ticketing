#!/bin/bash
set -e  # Exit immediately if a command exits with a non-zero status

echo "========================================"
echo "Starting Django Application Deployment"
echo "========================================"

# Wait for database to be ready
echo "Waiting for database..."
while ! nc -z ${DB_HOST:-localhost} ${DB_PORT:-5432}; do
  echo "Database is unavailable - sleeping"
  sleep 1
done
echo "✅ Database is up and ready!"

# Run makemigrations to create any new migrations
echo "Creating new migrations..."
python manage.py makemigrations --noinput || {
  echo "⚠️  makemigrations had warnings, continuing..."
}

# Run migrations
echo "Applying database migrations..."
python manage.py migrate --noinput || {
  echo "❌ Migration failed!"
  exit 1
}
echo "✅ Migrations applied successfully!"

# Create superuser if it doesn't exist
echo "Checking for superuser..."
python manage.py shell -c "
from django.contrib.auth import get_user_model;
User = get_user_model();
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123');
    print('✅ Superuser created: admin/admin123');
else:
    print('✅ Superuser already exists');
" || {
  echo "⚠️  Superuser creation skipped"
}

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput || {
  echo "⚠️  Static files collection had issues, continuing..."
}
echo "✅ Static files collected!"

# Start server
echo "========================================"
echo "Starting Gunicorn server on 0.0.0.0:8000"
echo "========================================"
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4 --timeout 120 --access-logfile - --error-logfile -
