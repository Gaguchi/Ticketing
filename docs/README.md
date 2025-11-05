# Ticketing System Documentation

Welcome to the Ticketing System documentation! This directory contains all project documentation organized by category.

## ⭐ Essential Reference

**[../PROJECT_REFERENCE.md](../PROJECT_REFERENCE.md)** - Critical reference for model fields, API patterns, and avoiding common errors. **Read this first!**

## 📁 Directory Structure

```
docs/
├── README.md                           # This file
├── SYSTEM_ARCHITECTURE.md              # Complete system architecture guide ⭐ START HERE
├── architecture.md                     # Frontend architecture
├── project-overview.md                 # High-level project overview
├── requirements.md                     # Project requirements
├── planning-session.md                 # Planning notes
├── SECURITY.md                         # Security guidelines
├── jira-7-9-2-database-schema.pdf     # Database schema reference
├── jira-7-9-2-database-schema_page-0001.jpg
├── starting_requirements_ge.txt        # Initial requirements
│
├── CHAT_IMPLEMENTATION.md              # Real-time chat/comment system ⭐
├── DATABASE_RESET_IMPLEMENTATION.md    # Database reset implementation
├── DEPLOYMENT_INSTRUCTIONS.md          # Comment system deployment guide
├── DESIGN_BIBLE.md                     # Design system and UI guidelines
├── DESIGN_IMPLEMENTATION_LOG.md        # Design implementation history
├── ENVIRONMENT_VARIABLES.md            # Environment configuration guide
├── FIXING_PROJECT_ROLES.md             # Project roles and permissions fixes
├── QUICKSTART_WEBSOCKETS.md            # Quick start guide for WebSockets
├── QUICK_FIX_SERVER_RESET.md           # Quick server reset procedures
├── QUICK_REFERENCE_DB_RESET.txt        # Quick database reset reference
├── TICKETMODAL_TODO.md                 # TicketModal feature TODOs
├── TOKEN_MANAGEMENT_GUIDE.md           # JWT token management
├── WEBSOCKET_CHECKLIST.md              # WebSocket implementation checklist
├── WEBSOCKET_CONFIG_FOR_DOKPLOY.md     # Dokploy WebSocket configuration
├── WEBSOCKET_GUIDE.md                  # Comprehensive WebSocket guide ⭐
├── WEBSOCKET_IMPLEMENTATION_SUMMARY.md # WebSocket implementation summary
├── COMPANIES_PAGE_DESIGNS.md           # Companies page design docs
├── CLEANUP_SUMMARY.md                  # Code cleanup summaries
├── FRONTEND_CLEANUP_SUMMARY.md         # Frontend cleanup summary
├── FRONTEND_API_GUIDE.md               # Frontend API usage guide
├── CLOUDFLARE_TURNSTILE_SETUP.md       # Cloudflare Turnstile setup
│
├── api/                                # API Documentation
│   ├── API_REFERENCE.md               # Complete API reference for LLMs
│   ├── API_TESTING.md                 # API testing guide
│   └── Ticketing_API.postman_collection.json  # Postman collection
│
├── deployment/                         # Deployment Documentation
│   ├── DEPLOYMENT.md                  # General deployment guide
│   ├── DEPLOYMENT_CHECKLIST.md        # Pre-deployment checklist
│   ├── DOKPLOY_DEPLOYMENT.md          # Dokploy-specific guide
│   ├── DOKPLOY_ENV.md                 # Environment variables for Dokploy
│   └── DOKPLOY_SETUP.md               # Dokploy initial setup
│
├── setup/                              # Setup & Configuration
│   ├── ENVIRONMENT_VARIABLES.md       # Environment variables reference
│   ├── ENV_SETUP.md                   # Environment setup guide
│   └── DATABASE_RESET.md              # Database reset guide (development)
│
├── troubleshooting/                    # Troubleshooting Guides
│   ├── API_TROUBLESHOOTING.md         # API issues
│   ├── FIXING_HTTPS_REDIRECT.md       # HTTPS redirect issues
│   ├── NETWORK-ERROR-ANALYSIS.md      # Network error debugging
│   ├── NETWORK_TESTING.md             # Network testing procedures
│   ├── ASSIGNEE-ISSUE-ANALYSIS.md     # Assignee-related issues
│   └── TICKET_CREATION_FIX.md         # Ticket creation problems
│
└── archive/                            # Archived Documentation
    ├── BACKEND_INTEGRATION.md         # Historical backend integration notes
    ├── KANBAN-MODAL-INTEGRATION.md    # Kanban modal implementation
    ├── LABELS_VS_TAGS.md              # Labels vs tags discussion
    ├── MODAL_IMPLEMENTATION_SUMMARY.md # Modal implementation notes
    ├── TICKET-MODAL-IMPLEMENTATION.md  # Ticket modal details
    ├── SCHEMA_UPDATE_AND_AUTH.md      # Schema updates history
    └── frontend/                       # Frontend implementation history
        ├── DASHBOARD-REDESIGN.md      # Dashboard redesign notes
        ├── DESIGN-UPDATES-JIRA-STYLE.md # Jira-style design updates
        ├── DESIGN-UPDATES.md          # General design updates
        ├── FONTAWESOME-INTEGRATION.md # Font Awesome integration
        ├── KANBAN-IMPLEMENTATION.md   # Kanban board implementation
        ├── LIST-VIEW-UPDATES.md       # List view updates
        └── README-ADMIN-DASHBOARD.md  # Admin dashboard notes
```

## 🚀 Quick Start

### For Developers

1. **Project Reference** ⭐ **START HERE**

   - Read: `../PROJECT_REFERENCE.md` - Essential reference for avoiding common errors
   - Contains: Model field names, API patterns, common pitfalls, debugging checklists

2. **System Architecture**

   - Read: `SYSTEM_ARCHITECTURE.md` - Complete guide to Projects, Users, and Tickets
   - Understand: Data models, relationships, and workflows

3. **WebSocket & Real-time Features**

   - Read: `WEBSOCKET_GUIDE.md` - Complete WebSocket implementation
   - Read: `CHAT_IMPLEMENTATION.md` - Real-time comment system
   - Quick Start: `QUICKSTART_WEBSOCKETS.md`

4. **Frontend Architecture**

   - Read: `architecture.md` - Complete frontend component documentation

5. **API Development**

   - Read: `api/API_REFERENCE.md` - Complete API documentation
   - Import: `api/Ticketing_API.postman_collection.json` into Postman
   - Test: Use super-secret-key authentication for quick testing

6. **Environment Setup**

   - Follow: `setup/ENV_SETUP.md`
   - Reference: `ENVIRONMENT_VARIABLES.md`
   - Reset Database: `DATABASE_RESET_IMPLEMENTATION.md` (development only)

7. **Deployment**
   - Check: `deployment/DEPLOYMENT_CHECKLIST.md`
   - Follow: `deployment/DOKPLOY_DEPLOYMENT.md`
   - WebSocket Config: `WEBSOCKET_CONFIG_FOR_DOKPLOY.md`

### For LLMs/AI Assistants

1. **Project Reference**: `../PROJECT_REFERENCE.md` ⭐ **MUST READ**

   - Model field names (e.g., Comment.user NOT Comment.author)
   - API endpoint patterns
   - Common pitfalls and correct implementations
   - Debugging checklists

2. **API Reference**: `api/API_REFERENCE.md`

   - Contains all endpoints, request/response formats
   - Authentication methods (JWT + super-secret-key)
   - Common patterns and best practices

3. **Postman Collection**: `api/Ticketing_API.postman_collection.json`
   - Import into Postman for interactive testing
   - Includes all endpoints with examples

## 📚 Key Documents

### Essential References

| Document                                               | Description                                 |
| ------------------------------------------------------ | ------------------------------------------- |
| [**PROJECT_REFERENCE.md**](../PROJECT_REFERENCE.md) ⭐ | Model fields, API patterns, common pitfalls |
| [CHAT_IMPLEMENTATION.md](CHAT_IMPLEMENTATION.md)       | Real-time comment system implementation     |
| [WEBSOCKET_GUIDE.md](WEBSOCKET_GUIDE.md)               | Complete WebSocket guide                    |

### Architecture

| Document                                         | Description                                       |
| ------------------------------------------------ | ------------------------------------------------- |
| [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) | System architecture overview                      |
| [architecture.md](architecture.md)               | Frontend architecture and component documentation |
| [DESIGN_BIBLE.md](DESIGN_BIBLE.md)               | Design system and UI guidelines                   |

### API Documentation

| Document                                                        | Description                         |
| --------------------------------------------------------------- | ----------------------------------- |
| [API_REFERENCE.md](api/API_REFERENCE.md)                        | Complete API documentation for LLMs |
| [API_TESTING.md](api/API_TESTING.md)                            | API testing procedures              |
| [Postman Collection](api/Ticketing_API.postman_collection.json) | Importable Postman collection       |

### Deployment

| Document                                                      | Description                       |
| ------------------------------------------------------------- | --------------------------------- |
| [DEPLOYMENT.md](deployment/DEPLOYMENT.md)                     | General deployment guide          |
| [DEPLOYMENT_CHECKLIST.md](deployment/DEPLOYMENT_CHECKLIST.md) | Pre-deployment verification       |
| [DOKPLOY_DEPLOYMENT.md](deployment/DOKPLOY_DEPLOYMENT.md)     | Dokploy deployment steps          |
| [DOKPLOY_ENV.md](deployment/DOKPLOY_ENV.md)                   | Environment variables for Dokploy |

### Setup & Configuration

| Document                                                             | Description                         |
| -------------------------------------------------------------------- | ----------------------------------- |
| [ENV_SETUP.md](setup/ENV_SETUP.md)                                   | Environment setup instructions      |
| [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md)                 | All environment variables explained |
| [DATABASE_RESET_IMPLEMENTATION.md](DATABASE_RESET_IMPLEMENTATION.md) | Database reset guide (development)  |
| [TOKEN_MANAGEMENT_GUIDE.md](TOKEN_MANAGEMENT_GUIDE.md)               | JWT token management                |
| [CLOUDFLARE_TURNSTILE_SETUP.md](CLOUDFLARE_TURNSTILE_SETUP.md)       | Cloudflare Turnstile configuration  |

### WebSocket & Real-time

| Document                                                                   | Description                    |
| -------------------------------------------------------------------------- | ------------------------------ |
| [WEBSOCKET_GUIDE.md](WEBSOCKET_GUIDE.md) ⭐                                | Comprehensive WebSocket guide  |
| [QUICKSTART_WEBSOCKETS.md](QUICKSTART_WEBSOCKETS.md)                       | Quick WebSocket setup          |
| [WEBSOCKET_IMPLEMENTATION_SUMMARY.md](WEBSOCKET_IMPLEMENTATION_SUMMARY.md) | Implementation summary         |
| [WEBSOCKET_CHECKLIST.md](WEBSOCKET_CHECKLIST.md)                           | Implementation checklist       |
| [WEBSOCKET_CONFIG_FOR_DOKPLOY.md](WEBSOCKET_CONFIG_FOR_DOKPLOY.md)         | Dokploy-specific configuration |

### Troubleshooting

| Document                                                               | Description              |
| ---------------------------------------------------------------------- | ------------------------ |
| [API_TROUBLESHOOTING.md](troubleshooting/API_TROUBLESHOOTING.md)       | API debugging guide      |
| [NETWORK-ERROR-ANALYSIS.md](troubleshooting/NETWORK-ERROR-ANALYSIS.md) | Network issues           |
| [TICKET_CREATION_FIX.md](troubleshooting/TICKET_CREATION_FIX.md)       | Ticket creation problems |

## 🔑 Authentication

The API supports two authentication methods:

### 1. JWT Bearer Token (Production)

```bash
# Login
POST /api/tickets/auth/login/
{"username": "admin", "password": "admin"}

# Use token
Authorization: Bearer <access_token>
```

### 2. Super Secret Key (Development/Testing)

```bash
# Add header to any request
X-Super-Secret-Key: dev-super-secret-key-12345
```

**⚠️ WARNING:** Super-secret-key should NEVER be used in production!

## 🧪 Testing the API

### Using Postman

1. Import `api/Ticketing_API.postman_collection.json`
2. Set environment variables:
   - `base_url`: http://31.97.181.167/api
   - `super_secret_key`: dev-super-secret-key-12345
3. Test endpoints without authentication using super-secret-key header

### Using cURL

```bash
# Test with super-secret-key
curl -H "X-Super-Secret-Key: dev-super-secret-key-12345" \
     http://31.97.181.167/api/tickets/tickets/

# Test with JWT token
curl -H "Authorization: Bearer <token>" \
     http://31.97.181.167/api/tickets/tickets/
```

## 📖 Documentation Conventions

- **Markdown files**: Use `.md` extension
- **Code blocks**: Include language identifier
- **Examples**: Provide complete, working examples
- **Errors**: Document common errors and solutions
- **Updates**: Keep documentation in sync with code changes

## 🗂️ Archive Policy

When documentation becomes outdated:

1. Move to `archive/` folder
2. Add date prefix to filename
3. Update this README
4. Create new version if needed

## 🤝 Contributing

When adding new documentation:

1. Choose appropriate category folder
2. Use clear, descriptive filenames
3. Include examples and error cases
4. Update this README
5. Cross-reference related docs

## 📞 Support

For questions or issues:

- Check troubleshooting guides first
- Review API_REFERENCE.md for endpoint details
- Check archive/ for historical context

## 🔄 Recent Changes

- **2025-11-05**: Major documentation cleanup
  - Created **PROJECT_REFERENCE.md** with critical model field names and API patterns
  - Moved all documentation files to `docs/` folder
  - Kept only PROJECT_REFERENCE.md in root for easy access
  - Added comprehensive docs/README.md with categorized index
  - Documented WebSocket implementation
  - Added real-time comment system documentation
- **2025-10-29**: Reorganized documentation structure
  - Created category folders (api/, deployment/, setup/, troubleshooting/, archive/)
  - Moved all root-level docs to appropriate folders
  - Created comprehensive API_REFERENCE.md for LLMs
  - Added Postman collection
  - Implemented super-secret-key authentication
  - Removed redundant folders (kanban/, static/)
  - Cleaned up old test scripts
  - Organized frontend documentation
  - Moved architecture.md to main docs/
  - Created archive/frontend/ for implementation history
  - Updated frontend/README.md

## 📋 TODO

- [ ] Add architecture diagrams
- [x] Create database schema documentation
- [x] Add frontend component documentation (architecture.md)
- [ ] Create user guides
- [ ] Add performance tuning guide
- [ ] Create backup/restore procedures

---

**Last Updated**: November 5, 2025
