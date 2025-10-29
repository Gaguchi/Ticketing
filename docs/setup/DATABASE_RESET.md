# Database Reset - Quick Reference

## Usage

### Basic Reset (with confirmation)

```powershell
cd backend
.\reset_db.ps1
```

### Reset + Create Superuser

```powershell
cd backend
.\reset_db.ps1 -CreateSuperuser
```

### Reset + Superuser + Load Fixtures

```powershell
cd backend
.\reset_db.ps1 -CreateSuperuser -LoadFixtures
```

### Skip Confirmation Prompt

```powershell
cd backend
.\reset_db.ps1 -CreateSuperuser -NoInput
```

## Direct Django Command

You can also use the Django management command directly:

```powershell
cd backend
python manage.py reset_db --create-superuser
```

## Options

- `-CreateSuperuser`: Creates default admin user (admin/admin123)
- `-LoadFixtures`: Loads any JSON fixtures from `backend/fixtures/`
- `-NoInput`: Skips confirmation prompts (use with caution!)

## Default Superuser Credentials

When using `-CreateSuperuser`:

- **Username**: admin
- **Password**: admin123
- **Email**: admin@example.com

⚠️ **Remember to change these credentials in production!**

## Safety Features

- Only works when `DEBUG=True` in settings
- Requires confirmation before proceeding (unless `-NoInput` is used)
- Shows clear warnings before deleting data

## What It Does

1. ✅ Drops all database tables
2. ✅ Runs migrations from scratch
3. ✅ Creates superuser (if requested)
4. ✅ Loads fixtures (if requested)

## Example Workflow

```powershell
# 1. Reset database with fresh superuser
cd backend
.\reset_db.ps1 -CreateSuperuser

# 2. Login to admin panel
# Visit: http://localhost:8000/admin
# Username: admin
# Password: admin123

# 3. Start fresh development!
```

## Troubleshooting

### Permission Denied

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Database Connection Error

Check your `.env` file has correct database credentials:

```
DB_HOST=31.97.181.167
DB_PORT=5433
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_password
```

### Command Not Found

Make sure you're in the project root directory and Python is in your PATH.
