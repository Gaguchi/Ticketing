# Service Desk Portal

A customer-facing support portal built with React, TypeScript, Vite, and Ant Design.

## Features

- 🎫 Create and manage support tickets
- 💬 Add comments to tickets
- 👤 User profile management
- 🔒 Change password
- 📱 Responsive design
- 🎨 Clean, modern UI with Ant Design

## Tech Stack

- React 19
- TypeScript
- Vite
- Ant Design 5
- React Router 7

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
cd servicedesk
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:3001`

### Build

```bash
npm run build
```

### Docker

```bash
docker build -t servicedesk .
docker run -p 80:80 servicedesk
```

## Project Structure

```
servicedesk/
├── src/
│   ├── components/       # Reusable components
│   ├── config/          # Configuration files
│   ├── contexts/        # React contexts (Auth, etc.)
│   ├── pages/           # Page components
│   ├── services/        # API services
│   ├── theme/           # Ant Design theme
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── Dockerfile           # Docker configuration
├── nginx.conf           # Nginx configuration for production
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

## Available Pages

- `/login` - Login page
- `/tickets` - My tickets list
- `/tickets/:id` - Ticket detail
- `/create-ticket` - Create new ticket
- `/profile` - User profile
- `/change-password` - Change password

## API Integration

The app connects to the backend API at `http://localhost:8000` by default. Configure this in `src/config/api.ts`.

## Environment Variables

Create a `.env` file:

```
VITE_API_BASE_URL=http://localhost:8000
```

## License

Private - Internal Use Only
