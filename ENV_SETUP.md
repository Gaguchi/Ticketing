# Environment Setup

## Quick Start

1. **Copy the example environment file:**
   ```bash
   cp backend/.env.example backend/.env
   ```

2. **Edit `backend/.env` with your actual credentials:**
   ```bash
   # Update these values:
   DB_HOST=your-database-host
   DB_PASSWORD=your-secure-password
   SECRET_KEY=your-generated-secret-key
   ```

3. **Never commit the `.env` file!**
   - It's already in `.gitignore`
   - Contains sensitive credentials
   - Each developer/deployment needs their own

## Environment Variables Explained

### Database Configuration

```bash
# Internal Docker host (for Dokploy deployment)
DB_HOST=tickets-db-ydxqzn

# External host (for local development)
DB_HOST=31.97.181.167

# Database credentials
DB_PORT=5432  # or 5433 for external access
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password-here
```

### Django Configuration

```bash
# Generate with: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
SECRET_KEY=your-secret-key

# Development mode
DEBUG=True

# Comma-separated list of allowed hosts
ALLOWED_HOSTS=localhost,127.0.0.1,yourdomain.com
```

### CORS Configuration

```bash
# Comma-separated list of allowed origins
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Deployment-Specific Configurations

### Local Development

```bash
DATABASE_URL=postgresql://postgres:password@31.97.181.167:5433/postgres
DB_HOST=31.97.181.167
DB_PORT=5433
DEBUG=True
```

### Dokploy Deployment

Set environment variables in Dokploy dashboard:
```bash
DATABASE_URL=postgresql://postgres:password@tickets-db-ydxqzn:5432/postgres
DB_HOST=tickets-db-ydxqzn
DB_PORT=5432
DEBUG=False
```

## Security Notes

⚠️ **NEVER commit these files:**
- `backend/.env`
- Any file containing passwords or API keys
- Database dumps with real data

✅ **SAFE to commit:**
- `backend/.env.example` (with placeholder values only)
- Configuration files using environment variables
- Documentation without credentials

## Checking Before Commit

```bash
# Always check what you're committing
git status
git diff

# Search for secrets (should return nothing)
git diff | grep -i password
git diff | grep -i secret
```

## If You Accidentally Committed Secrets

1. **IMMEDIATELY change the exposed password**
2. Follow instructions in `SECURITY.md`
3. Clean Git history
4. Notify team lead

## Need Help?

See `SECURITY.md` for detailed security practices and incident response procedures.
