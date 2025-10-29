# Ticketing System

A modern, Jira-inspired ticketing system with multi-tenant company support built with Django REST Framework and React.

## 📁 Project Structure

```
Ticketing/
├── backend/                    # Django REST API
│   ├── config/                # Django settings
│   ├── tickets/               # Main application
│   ├── manage.py
│   └── requirements.txt
│
├── frontend/                   # React + TypeScript + Ant Design
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/             # Page components
│   │   ├── contexts/          # React contexts
│   │   ├── layouts/           # Layout components
│   │   └── services/          # API services
│   ├── package.json
│   └── vite.config.ts
│
└── docs/                       # All documentation
    ├── README.md              # Documentation index
    ├── api/                   # API documentation
    ├── deployment/            # Deployment guides
    ├── setup/                 # Setup instructions
    ├── troubleshooting/       # Troubleshooting guides
    └── archive/               # Archived docs
```

## 🚀 Quick Start

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env  # Create .env file

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

### Database Reset (Development Only)

Need a fresh start? Reset the database:

**Windows (PowerShell):**

```powershell
cd backend
.\reset_db.ps1 -CreateSuperuser
```

**Linux/Mac (Bash):**

```bash
cd backend
chmod +x reset_db.sh  # First time only
./reset_db.sh --create-superuser
```

**Django directly:**

```bash
cd backend
python manage.py reset_db --create-superuser
```

📖 See [Database Reset Guide](docs/setup/DATABASE_RESET.md) for more options.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

## 🔑 Authentication

### JWT Bearer Token (Production)

```http
POST /api/tickets/auth/login/
{
  "username": "admin",
  "password": "admin"
}
```

### Super Secret Key (Development/Testing)

```http
GET /api/tickets/tickets/
X-Super-Secret-Key: dev-super-secret-key-12345
```

⚠️ **WARNING**: Super-secret-key authentication is for development only!

## 📚 Documentation

All documentation is in the `docs/` folder:

- **[API Reference](docs/api/API_REFERENCE.md)** - Complete API documentation
- **[Postman Collection](docs/api/Ticketing_API.postman_collection.json)** - Import into Postman
- **[Deployment Guide](docs/deployment/DOKPLOY_DEPLOYMENT.md)** - How to deploy
- **[Setup Guide](docs/setup/ENV_SETUP.md)** - Environment setup
- **[Troubleshooting](docs/troubleshooting/)** - Common issues and fixes

## 🧪 Testing

### Test API with Postman

1. Import `docs/api/Ticketing_API.postman_collection.json`
2. Set `super_secret_key` environment variable
3. Test endpoints without login

### Test API with cURL

```bash
curl -H "X-Super-Secret-Key: dev-super-secret-key-12345" \
     http://31.97.181.167/api/tickets/tickets/
```

## 🛠️ Tech Stack

### Backend

- **Django 5.1.4** - Web framework
- **Django REST Framework** - API framework
- **PostgreSQL** - Database
- **Simple JWT** - JWT authentication
- **CORS Headers** - Cross-origin support

### Frontend

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Ant Design 5.22** - UI components
- **Vite** - Build tool
- **React Router** - Routing
- **dnd-kit** - Drag and drop

## 📦 Key Features

- ✅ Jira-style Kanban board with drag-and-drop
- ✅ Ticket management (CRUD operations)
- ✅ **Multi-tenant company support** - IT services managing multiple client companies
- ✅ **Company-based ticket organization** - General and company-specific tickets
- ✅ **Role-based access control** - IT Admins, Company Users, Project Members
- ✅ Tag-based organization
- ✅ Contact management
- ✅ Comments and attachments
- ✅ Deadline-based views
- ✅ Search and filtering
- ✅ Real-time updates
- ✅ JWT authentication
- ✅ Super-secret-key for testing

## 🌐 API Endpoints

Base URL: `http://31.97.181.167/api`

### Authentication

- `POST /tickets/auth/register/` - Register new user
- `POST /tickets/auth/login/` - Login
- `POST /tickets/auth/token/refresh/` - Refresh token
- `GET /tickets/auth/me/` - Get current user

### Tickets

- `GET /tickets/tickets/` - List tickets
- `POST /tickets/tickets/` - Create ticket
- `GET /tickets/tickets/{id}/` - Get ticket
- `PATCH /tickets/tickets/{id}/` - Update ticket
- `DELETE /tickets/tickets/{id}/` - Delete ticket
- `POST /tickets/tickets/{id}/toggle_follow/` - Toggle follow

### Companies

- `GET /tickets/companies/` - List companies
- `POST /tickets/companies/` - Create company
- `GET /tickets/companies/{id}/` - Get company
- `PATCH /tickets/companies/{id}/` - Update company
- `DELETE /tickets/companies/{id}/` - Delete company
- `POST /tickets/companies/{id}/assign_admin/` - Add IT admin
- `POST /tickets/companies/{id}/remove_admin/` - Remove IT admin
- `POST /tickets/companies/{id}/assign_user/` - Add company user
- `POST /tickets/companies/{id}/remove_user/` - Remove company user

### Projects, Columns, Tags, Contacts, Comments, Attachments

See [API Reference](docs/api/API_REFERENCE.md) for complete documentation.

## 🔧 Environment Variables

### Backend (.env)

```bash
SECRET_KEY=your-django-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,31.97.181.167
SUPER_SECRET_KEY=dev-super-secret-key-12345
DATABASE_URL=postgresql://user:password@localhost:5432/ticketing
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend (.env)

```bash
VITE_API_BASE_URL=http://31.97.181.167/api
```

## 📝 Development Notes

### Super Secret Key Authentication

For quick testing without JWT tokens:

```python
# In settings.py
SUPER_SECRET_KEY = os.getenv('SUPER_SECRET_KEY', 'dev-super-secret-key-12345')

# Authentication class automatically checks this header
X-Super-Secret-Key: dev-super-secret-key-12345
```

### Kanban Drag and Drop

- Uses `dnd-kit` library
- Optimistic updates with rollback on error
- Auto-saves column changes via PATCH requests

### Deadline View

- 7 time-based categories
- Color-coded columns
- Checks both `due_date` and `dueDate` properties

## 🚢 Deployment

See [Deployment Guide](docs/deployment/DOKPLOY_DEPLOYMENT.md) for detailed instructions.

### Quick Deploy

```bash
# Backend
docker build -t ticketing-backend ./backend
docker run -p 8000:8000 ticketing-backend

# Frontend
docker build -t ticketing-frontend ./frontend
docker run -p 80:80 ticketing-frontend
```

## 🤝 Contributing

1. Check documentation in `docs/` folder
2. Follow existing code style
3. Write tests for new features
4. Update documentation
5. Submit pull request

## 📞 Support

- 📖 Documentation: `docs/README.md`
- 🐛 Issues: Check `docs/troubleshooting/`
- 💬 API Questions: See `docs/api/API_REFERENCE.md`

## 📄 License

This project is proprietary and confidential.

---

**Version**: 2.0.0  
**Last Updated**: January 24, 2025
