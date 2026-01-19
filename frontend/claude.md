# Frontend Service (Admin App) - AI Instructions

React 19 admin interface for IT staff and project administrators.

## Tech Stack

- **Framework**: React 19.1, TypeScript 5.9
- **Build Tool**: Vite 6.0
- **UI Library**: Ant Design 5.27
- **Routing**: React Router 7.9
- **Rich Text**: TipTap 3.10
- **Drag & Drop**: @dnd-kit
- **Charts**: Recharts 3.6
- **Calendar**: react-big-calendar

## Directory Structure

```
frontend/
├── src/
│   ├── main.tsx              # App entry point
│   ├── App.tsx               # Root component + routing
│   ├── index.css             # Global styles
│   │
│   ├── components/           # Reusable UI components
│   │   ├── common/           # Generic components (buttons, modals)
│   │   ├── tickets/          # Ticket-related components
│   │   ├── kanban/           # Kanban board components
│   │   └── ...
│   │
│   ├── pages/                # Route page components
│   │   ├── Dashboard.tsx
│   │   ├── KanbanBoard.tsx
│   │   ├── TicketList.tsx
│   │   ├── Companies.tsx
│   │   ├── ProjectSettings.tsx
│   │   └── ...
│   │
│   ├── contexts/             # React contexts
│   │   └── AppContext.tsx    # Central state: auth + project selection
│   │
│   ├── services/             # API layer
│   │   └── api.service.ts    # HTTP client with token management
│   │
│   ├── config/               # Configuration
│   │   └── api.ts            # API endpoint definitions
│   │
│   ├── hooks/                # Custom React hooks
│   ├── layouts/              # Layout components (Sidebar, Header)
│   ├── theme/                # Ant Design theme customization
│   ├── types/                # TypeScript type definitions
│   └── utils/                # Utility functions
│
├── public/                   # Static assets
├── package.json
├── vite.config.ts            # Vite config + dev proxy
├── tsconfig.json
└── Dockerfile
```

## Key Files

### AppContext (`src/contexts/AppContext.tsx`)

Central state management combining auth and project selection:

```tsx
interface AppContextType {
  user: User | null;
  isAuthenticated: boolean;
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  // ... more
}

// Usage in components
const { user, selectedProject, isAuthenticated } = useApp();
```

### API Service (`src/services/api.service.ts`)

HTTP client with automatic token refresh:

```tsx
import apiService from '../services/api.service';
import { API_ENDPOINTS } from '../config/api';

// GET request
const tickets = await apiService.get(API_ENDPOINTS.TICKETS);

// POST request
await apiService.post(API_ENDPOINTS.TICKETS, { name: 'New Ticket', ... });

// PATCH request
await apiService.patch(`${API_ENDPOINTS.TICKETS}${id}/`, updateData);

// DELETE request
await apiService.delete(`${API_ENDPOINTS.TICKETS}${id}/`);
```

### API Endpoints (`src/config/api.ts`)

All backend endpoint constants:

```tsx
export const API_ENDPOINTS = {
  // Auth
  LOGIN: "/api/tickets/auth/login/",
  REFRESH: "/api/tickets/auth/refresh/",

  // Core
  TICKETS: "/api/tickets/tickets/",
  PROJECTS: "/api/tickets/projects/",
  COMPANIES: "/api/tickets/companies/",
  COLUMNS: "/api/tickets/columns/",
  TAGS: "/api/tickets/tags/",

  // ... more
};
```

## Component Patterns

### Page Component Structure

```tsx
// src/pages/TicketList.tsx
import { useApp } from "../contexts/AppContext";
import apiService from "../services/api.service";
import { API_ENDPOINTS } from "../config/api";

const TicketList: React.FC = () => {
  const { selectedProject } = useApp();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedProject) {
      loadTickets();
    }
  }, [selectedProject]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const response = await apiService.get(
        `${API_ENDPOINTS.TICKETS}?project=${selectedProject?.id}`,
      );
      setTickets(response.data.results);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Table
      dataSource={tickets}
      loading={loading}
      columns={columns}
      // ...
    />
  );
};
```

### Ant Design Patterns

```tsx
// Modal for destructive actions
Modal.confirm({
  title: 'Delete Ticket?',
  content: 'This action cannot be undone.',
  okText: 'Delete',
  okType: 'danger',
  onOk: () => handleDelete(id),
});

// Form with validation
const [form] = Form.useForm();

<Form form={form} onFinish={handleSubmit} layout="vertical">
  <Form.Item
    name="name"
    label="Ticket Name"
    rules={[{ required: true, message: 'Required' }]}
  >
    <Input />
  </Form.Item>
  <Form.Item>
    <Button type="primary" htmlType="submit">Submit</Button>
  </Form.Item>
</Form>

// Table with pagination from API
<Table
  dataSource={tickets}
  pagination={{
    total: totalCount,
    pageSize: 20,
    onChange: (page) => loadTickets(page),
  }}
/>
```

### Kanban Drag & Drop

```tsx
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

<DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
  <SortableContext items={tickets} strategy={verticalListSortingStrategy}>
    {tickets.map((ticket) => (
      <SortableTicketCard key={ticket.id} ticket={ticket} />
    ))}
  </SortableContext>
</DndContext>;
```

## Routing (`src/App.tsx`)

```tsx
<BrowserRouter>
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route element={<AuthenticatedLayout />}>
      <Route path="/" element={<Dashboard />} />
      <Route path="/board" element={<KanbanBoard />} />
      <Route path="/tickets" element={<TicketList />} />
      <Route path="/tickets/:id" element={<TicketDetail />} />
      <Route path="/companies" element={<Companies />} />
      <Route path="/settings" element={<ProjectSettings />} />
    </Route>
  </Routes>
</BrowserRouter>
```

## Development Commands

```bash
# Install dependencies
npm install

# Development server (port 5173)
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
    port: 5173,
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

Create `.env` for local development:

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
VITE_APP_NAME=Ticketing System
VITE_APP_VERSION=1.0.0
```

## WebSocket Usage

```tsx
const wsUrl = `${import.meta.env.VITE_WS_BASE_URL}/ws/chat/${roomId}/`;
const ws = new WebSocket(wsUrl);

ws.onopen = () => console.log("Connected");
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle message
};
ws.onclose = () => console.log("Disconnected");
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

- **Build Path**: `/frontend`
- **Internal Port**: 80
- **Domain**: `tickets.your-domain.com`

### Build Arguments (set in Dokploy)

```bash
VITE_API_BASE_URL=https://api.your-domain.com
VITE_WS_BASE_URL=wss://api.your-domain.com
VITE_APP_NAME=Ticketing System
VITE_APP_VERSION=1.0.0
```

### nginx.conf

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## ⚠️ Important Notes

1. **Use `useApp()` hook** for auth state, never manage tokens directly
2. **Always use `apiService`** - it handles token refresh automatically
3. **API endpoints** must be defined in `config/api.ts`
4. **Ant Design 5** - don't import from `antd/lib`, use `antd` directly
5. **React 19** - be aware of new features and breaking changes
6. **Vite proxy** handles API routing in dev - no CORS issues locally
7. **Build args** are baked in at build time - can't change without rebuild
