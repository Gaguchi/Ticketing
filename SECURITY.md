# Security Best Practices

## Environment Variables

### Never Commit Credentials

**❌ DO NOT:**

- Commit `.env` files with real credentials
- Hardcode passwords in source code
- Put credentials in documentation
- Use default passwords in `settings.py`

**✅ DO:**

- Use `.env` files (gitignored)
- Set credentials via environment variables
- Use `.env.example` with placeholder values
- Document required environment variables without values

### Required Environment Variables

Create a `.env` file in the `backend/` directory with these variables:

```bash
# Database Configuration
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-secure-password

# Django Configuration
SECRET_KEY=your-secret-key-here
DEBUG=True  # Set to False in production
ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Generating Secure Keys

Generate a secure Django SECRET_KEY:

```python
from django.core.management.utils import get_random_secret_key
print(get_random_secret_key())
```

Or use command line:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## Git Security

### .gitignore

Ensure your `.gitignore` includes:

```
# Environment variables
.env
.env.local
.env.*.local

# Django
*.log
db.sqlite3
```

### Check for Exposed Secrets

Before committing:

```bash
# Check what will be committed
git status
git diff --staged

# Search for potential secrets
git grep -i "password"
git grep -i "secret"
git grep -E "[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}"
```

### If You Already Committed Secrets

If you accidentally committed secrets:

1. **Immediately change the exposed credentials**
2. **Remove from Git history:**

```bash
# Install BFG Repo-Cleaner
# Download from: https://rtyley.github.io/bfg-repo-cleaner/

# Remove passwords from all commits
bfg --replace-text passwords.txt

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (WARNING: rewrites history)
git push --force
```

3. **Alternative using git filter-branch:**

```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

git push --force --all
```

## Database Security

### Connection Security

**For Production:**

- Use SSL/TLS for database connections
- Restrict access by IP whitelist
- Use strong passwords (min 20 characters)
- Rotate passwords regularly

**For Dokploy Deployment:**

```bash
# Set environment variables in Dokploy dashboard
DB_HOST=internal-db-host
DB_PASSWORD=<strong-password>
```

### Password Requirements

Generate strong passwords:

```bash
# Linux/Mac
openssl rand -base64 32

# Python
import secrets
print(secrets.token_urlsafe(32))
```

## Django Security Settings

### Production Checklist

In `settings.py` for production:

```python
# Security
DEBUG = False
SECRET_KEY = os.getenv('SECRET_KEY')  # Required, no default
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '').split(',')

# HTTPS
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Additional Headers
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
```

### CORS Configuration

Only allow trusted origins:

```python
CORS_ALLOWED_ORIGINS = [
    "https://yourdomain.com",
    "https://www.yourdomain.com",
]

# Don't use in production:
# CORS_ALLOW_ALL_ORIGINS = True  # ❌ DANGEROUS
```

## API Security

### Authentication (To Be Implemented)

Current state: `AllowAny` permission (development only)

**For Production:**

- Implement JWT token authentication
- Use Django REST Framework permissions
- Rate limiting
- API key authentication for third-party integrations

### Planned Implementation:

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour'
    }
}
```

## File Upload Security

### Settings for Attachments:

```python
# Max file size (10MB)
FILE_UPLOAD_MAX_MEMORY_SIZE = 10485760

# Allowed file types
ALLOWED_UPLOAD_EXTENSIONS = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.png', '.jpg', '.jpeg', '.gif',
    '.txt', '.csv', '.zip'
]

# Virus scanning (recommended)
# Use ClamAV or similar
```

## Monitoring & Alerts

### GitGuardian

Already monitoring for:

- Generic passwords
- PostgreSQL URIs
- API keys
- Private keys

### Recommended Tools:

1. **Dependabot** - Dependency vulnerability alerts
2. **Snyk** - Security scanning
3. **OWASP Dependency Check**
4. **Bandit** - Python security linter

```bash
# Install bandit
pip install bandit

# Scan code
bandit -r backend/
```

## Incident Response

### If Credentials Are Exposed:

1. **Immediate Actions:**

   - [ ] Change all exposed passwords
   - [ ] Revoke exposed API keys
   - [ ] Review access logs for unauthorized activity
   - [ ] Remove credentials from Git history
   - [ ] Force push cleaned repository

2. **Investigation:**

   - [ ] Check database logs for suspicious queries
   - [ ] Review application logs
   - [ ] Check for data exfiltration
   - [ ] Document findings

3. **Prevention:**
   - [ ] Update security procedures
   - [ ] Add pre-commit hooks
   - [ ] Train team on security practices
   - [ ] Implement secrets scanning in CI/CD

## Pre-commit Hooks

Install pre-commit hooks to prevent committing secrets:

```bash
# Install pre-commit
pip install pre-commit

# Create .pre-commit-config.yaml
cat > .pre-commit-config.yaml << EOF
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: detect-private-key
      - id: check-added-large-files
      - id: check-yaml
      - id: end-of-file-fixer
      - id: trailing-whitespace

  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
EOF

# Install hooks
pre-commit install

# Run on all files
pre-commit run --all-files
```

## Regular Security Audits

### Weekly:

- Review access logs
- Check for failed login attempts
- Update dependencies

### Monthly:

- Rotate database passwords
- Review user permissions
- Audit API usage
- Check for outdated packages

### Quarterly:

- Full security audit
- Penetration testing
- Update security documentation
- Team security training

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Django Security](https://docs.djangoproject.com/en/5.1/topics/security/)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/)
- [DRF Security](https://www.django-rest-framework.org/topics/security/)

## Contact

For security issues:

- **DO NOT** open public GitHub issues
- Email: security@yourdomain.com (set this up)
- Report vulnerabilities privately
