# Database Reset - Quick Reference

## Usage

### Windows (PowerShell)

#### Basic Reset (with confirmation)

```powershell
cd backend
.\reset_db.ps1
```

#### Reset + Create Superuser

```powershell
cd backend
.\reset_db.ps1 -CreateSuperuser
```

#### Reset + Superuser + Load Fixtures

```powershell
cd backend
.\reset_db.ps1 -CreateSuperuser -LoadFixtures
```

#### Skip Confirmation Prompt

```powershell
cd backend
.\reset_db.ps1 -CreateSuperuser -NoInput
```

### Linux/Mac (Bash)

#### First Time Setup

```bash
cd backend
chmod +x reset_db.sh
```

#### Basic Reset (with confirmation)

```bash
cd backend
./reset_db.sh
```

#### Reset + Create Superuser

```bash
cd backend
./reset_db.sh --create-superuser
```

#### Reset + Superuser + Load Fixtures

```bash
cd backend
./reset_db.sh --create-superuser --load-fixtures
```

#### Skip Confirmation Prompt

```bash
cd backend
./reset_db.sh --create-superuser --no-input
```

## Direct Django Command

You can also use the Django management command directly:

```bash
cd backend
python manage.py reset_db --create-superuser
```

### All Command Options

```bash
python manage.py reset_db [options]

Options:
  --no-input            Skip confirmation prompts
  --create-superuser    Create default superuser (admin/admin123)
  --load-fixtures       Load JSON fixtures from backend/fixtures/
  --force-dev           Force run in dev mode (bypasses DEBUG check)
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

- Only works when `DEBUG=True` in settings (or with `--force-dev` flag)
- Requires confirmation before proceeding (unless `--no-input` is used)
- Shows clear warnings before deleting data

### Important: DEBUG Setting

The command requires `DEBUG=True` in your environment. If you see this error:

```
❌ Database reset is only allowed when DEBUG=True
```

**Option 1 (Recommended)**: Set `DEBUG=True` in your `.env` file:

```bash
DEBUG=True
```

Then restart your server and run the command again.

**Option 2 (Use with caution)**: Force development mode:

```bash
python manage.py reset_db --create-superuser --force-dev
```

⚠️ **Warning**: `--force-dev` bypasses the safety check. Only use this if you're absolutely sure you're in a development environment!

## What It Does

1. ✅ Drops all database tables
2. ✅ Runs migrations from scratch
3. ✅ Creates superuser (if requested)
4. ✅ Loads fixtures (if requested)

## Example Workflow

**Windows:**

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

**Linux/Mac:**

```bash
# 1. Reset database with fresh superuser
cd backend
./reset_db.sh --create-superuser

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
