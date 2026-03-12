# Service Desk Portal Setup Guide

## Overview
The Service Desk is a separate React application for company end-users to submit and track their support tickets. It runs on port 3001 and shares the same backend API.

## Step 1: Create the Project

Run these commands from the `Ticketing` directory:

```bash
# Create servicedesk directory
mkdir servicedesk
cd servicedesk

# Initialize npm (or manually create package.json from below)
npm init -y
```

## Step 2: Copy Configuration Files

### package.json
Create `servicedesk/package.json`:

```json
{
  "name": "servicedesk",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 3001",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@ant-design/icons": "^6.1.0",
    "@ant-design/v5-patch-for-react-19": "^1.0.3",
    "antd": "^5.27.5",
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "react-router-dom": "^7.9.4"
  },
  "devDependencies": {
    "@eslint/js": "^9.36.0",
    "@types/node": "^24.6.0",
    "@types/react": "^19.1.16",
    "@types/react-dom": "^19.1.9",
    "@vitejs/plugin-react": "^5.0.4",
    "eslint": "^9.36.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.22",
    "globals": "^16.4.0",
    "typescript": "~5.9.3",
    "typescript-eslint": "^8.45.0",
    "vite": "npm:rolldown-vite@7.1.14"
  },
  "overrides": {
    "vite": "npm:rolldown-vite@7.1.14"
  }
}
```

### vite.config.ts

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
```

### tsconfig.json

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

### tsconfig.app.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

### tsconfig.node.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
```

### index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Service Desk - Support Portal</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### .gitignore

```
# Logs
logs
*.log
npm-debug.log*

node_modules
dist
dist-ssr
*.local

.vscode/*
!.vscode/extensions.json
.idea
.DS_Store

# Environment variables
.env
.env.local
.env.production
```

## Step 3: Create Source Structure

```bash
cd servicedesk
mkdir -p src/config src/services src/contexts src/pages src/components src/theme src/types src/utils
```

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: I'll provide the source files

Please confirm once you've completed steps 1-4, and I'll generate all the source files for:
- API configuration
- Authentication context
- Service files
- Pages (Login, My Tickets, Create Ticket, Ticket Detail, Profile)
- Components (Navbar, TicketCard, etc.)
- Theme configuration
- TypeScript types

## Key Features

The Service Desk will include:

1. **Authentication**
   - Login page for company users
   - Session management
   - Password change

2. **My Tickets**
   - View all tickets created by the user
   - Filter by status
   - Search tickets
   - Sort by date/priority

3. **Create Ticket**
   - Simple form to submit support requests
   - Select priority
   - Add description
   - Optional file attachments

4. **Ticket Details**
   - View ticket status
   - See assigned IT admin
   - Add comments
   - View ticket history

5. **Profile**
   - Change password
   - Update contact info
   - View account details

## Ports

- Main Frontend: `http://localhost:5173`
- Service Desk: `http://localhost:3001`
- Backend API: `http://localhost:8000`

## Next Steps

After setup:
1. Run `npm run dev` in the servicedesk folder
2. Access at `http://localhost:3001`
3. Login with company user credentials created by superadmin
