# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

# Ticketing System - Frontend

React + TypeScript + Vite frontend for the Ticketing System with Jira-style interface.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- **React 18.3** - UI library
- **TypeScript 5.6** - Type safety
- **Vite 7.1** - Build tool
- **Ant Design 5.x** - UI components
- **@dnd-kit** - Drag-and-drop
- **Font Awesome** - Icons
- **React Router v6** - Routing

## Features

- 📊 **Dashboard** - Quick filters and ticket overview
- 🎯 **Kanban Board** - Drag-and-drop ticket management
- 📝 **List View** - Table-based ticket view
- 🎨 **Jira-Style UI** - Modern, professional design
- 🔍 **Search & Filter** - Find tickets quickly
- 💬 **Comments** - Collaborate on tickets
- 📎 **Attachments** - Upload files to tickets

## Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable components (KanbanBoard, TicketCard, etc.)
│   ├── pages/          # Page components (Dashboard, Tickets, etc.)
│   ├── types/          # TypeScript type definitions
│   ├── App.tsx         # Root component with routing
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── Dockerfile          # Docker configuration
└── nginx.conf          # Production server config
```

## Development

### Environment Variables

Create a `.env.local` file:

```env
VITE_API_URL=http://localhost:8000/api
```

### Running Locally

```bash
npm run dev
```

The app will be available at `http://localhost:5173` with hot module replacement.

## Docker Deployment

```bash
# Build image
docker build -t ticketing-frontend .

# Run container
docker run -p 8080:80 ticketing-frontend
```

Access at `http://localhost:8080`

## Documentation

- **Architecture** - See `/docs/architecture.md` for detailed component documentation
- **API Integration** - See `/docs/api/API_REFERENCE.md` for backend API docs
- **Implementation History** - See `/docs/archive/frontend/` for design evolution

## Scripts

- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Links

- [Main Documentation](../docs/README.md)
- [API Reference](../docs/api/API_REFERENCE.md)
- [Backend Setup](../backend/README.md)

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
