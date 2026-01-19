# ServiceDesk Service (Client Portal) - AI Instructions

React 19 client portal for company users to view and create tickets.

## Tech Stack

- **Framework**: React 19.1, TypeScript 5.9
- **Build Tool**: Vite 6.0
- **UI Library**: Ant Design 5.27 + Tailwind CSS 3.4
- **Routing**: React Router 7.9
- **Drag & Drop**: @dnd-kit

## Key Differences from Frontend (Admin App)

| Aspect       | Frontend (Admin)        | ServiceDesk (Client)      |
| ------------ | ----------------------- | ------------------------- |
| **Port**     | 5173                    | 3001                      |
| **Styling**  | Pure Ant Design         | Tailwind CSS + Ant Design |
| **Users**    | IT staff, admins        | Company users (clients)   |
| **Access**   | Full project management | View/create own tickets   |
| **Features** | Kanban, reports, admin  | Simple ticket list/create |

## Directory Structure

```
servicedesk/
├── src/
│   ├── main.tsx              # App entry point
│   ├── App.tsx               # Root component + routing
│   ├── index.css             # Tailwind imports + global styles
│   │
│   ├── components/           # Reusable UI components
│   │   └── ...
│   │
│   ├── pages/                # Route page components
│   │   ├── Login.tsx
│   │   ├── TicketList.tsx
│   │   ├── TicketDetail.tsx
│   │   ├── CreateTicket.tsx
│   │   └── ...
│   │
│   ├── contexts/             # React contexts
│   │   └── AppContext.tsx    # Auth + state (similar to frontend)
│   │
│   ├── services/             # API layer
│   │   └── api.service.ts    # HTTP client
│   │
│   ├── config/               # Configuration
│   │   └── api.ts            # API endpoints
│   │
│   ├── theme/                # Ant Design theme customization
│   ├── types/                # TypeScript types
│   └── utils/                # Utility functions
│
├── public/
├── package.json
├── vite.config.ts
├── tailwind.config.js        # Tailwind configuration
├── postcss.config.js
└── Dockerfile
```

## Styling Pattern (Tailwind + Ant Design)

The ServiceDesk uses Tailwind CSS for layout and custom styling, with Ant Design for complex components:

```tsx
// Tailwind for layout and spacing
<div className="min-h-screen bg-gray-50">
  <header className="bg-white shadow-sm px-6 py-4">
    <h1 className="text-2xl font-semibold text-gray-900">My Tickets</h1>
  </header>

  <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {/* Ant Design for complex components */}
    <Table
      dataSource={tickets}
      columns={columns}
      className="bg-white rounded-lg shadow"
    />
  </main>
</div>
```

### Tailwind Config (`tailwind.config.js`)

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1890ff", // Match Ant Design primary
      },
    },
  },
  plugins: [],
};
```

### CSS Setup (`src/index.css`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom styles after Tailwind */
```

## Component Patterns

### Page with Tailwind Layout

```tsx
const TicketList: React.FC = () => {
  const { user } = useApp();
  const [tickets, setTickets] = useState<Ticket[]>([]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Tickets</h1>
        <Button type="primary" onClick={() => navigate("/create")}>
          New Ticket
        </Button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table
          dataSource={tickets}
          columns={columns}
          pagination={{ pageSize: 10 }}
        />
      </div>
    </div>
  );
};
```

### Mixing Tailwind with Ant Design

```tsx
// Card with Tailwind wrapper
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {tickets.map((ticket) => (
    <Card
      key={ticket.id}
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate(`/ticket/${ticket.id}`)}
    >
      <div className="flex items-start justify-between">
        <span className="text-lg font-medium">{ticket.name}</span>
        <Tag color={priorityColors[ticket.priority_id]}>{ticket.priority}</Tag>
      </div>
    </Card>
  ))}
</div>
```

## API Integration

Same pattern as frontend - uses apiService:

```tsx
import apiService from "../services/api.service";
import { API_ENDPOINTS } from "../config/api";

// Fetch user's tickets (filtered by company)
const loadMyTickets = async () => {
  const response = await apiService.get(
    `${API_ENDPOINTS.TICKETS}?company=${user?.company_id}`,
  );
  setTickets(response.data.results);
};

// Create new ticket
const createTicket = async (data: CreateTicketData) => {
  await apiService.post(API_ENDPOINTS.TICKETS, {
    ...data,
    company: user?.company_id,
  });
};
```

## Development Commands

```bash
# Install dependencies
npm install

# Development server (port 3001)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Linting
npm run lint
```

## Vite Configuration (`vite.config.ts`)

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001, // Different from frontend!
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:8000",
        ws: true,
      },
    },
  },
});
```

## Environment Variables

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
VITE_APP_NAME=Service Desk
VITE_APP_VERSION=1.0.0
```

---

## Dokploy Deployment

### Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL
ARG VITE_WS_BASE_URL
ARG VITE_APP_NAME
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Dokploy Configuration

- **Build Path**: `/servicedesk`
- **Internal Port**: 80
- **Domain**: `desk.your-domain.com` or `support.your-domain.com`

### Build Arguments

```bash
VITE_API_BASE_URL=https://api.your-domain.com
VITE_WS_BASE_URL=wss://api.your-domain.com
VITE_APP_NAME=Service Desk
```

## Feature Scope (Client Portal)

### What users CAN do:

- ✅ Log in with company credentials
- ✅ View tickets for their company
- ✅ Create new tickets
- ✅ Add comments to tickets
- ✅ Upload attachments
- ✅ View ticket status/progress

### What users CANNOT do:

- ❌ Access admin panels
- ❌ View other companies' tickets
- ❌ Manage projects
- ❌ Assign tickets to users
- ❌ Change workflow columns
- ❌ Delete tickets

## ⚠️ Important Notes

1. **Port 3001** - Don't confuse with frontend (5173)
2. **Tailwind + Ant Design** - Different styling approach from frontend
3. **Company-scoped** - Users only see their company's tickets
4. **Simpler navigation** - No sidebar, streamlined UX
5. **Separate deployment** - Deploy as its own service in Dokploy
6. **Same API** - Uses identical backend endpoints, just filtered differently
