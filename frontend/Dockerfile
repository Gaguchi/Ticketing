# Test: full npm run build (tsc + vite) without nginx COPY
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ARG VITE_API_BASE_URL
ARG VITE_WS_BASE_URL
ARG VITE_APP_NAME="Ticketing System"
ARG VITE_APP_VERSION=1.0.0

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_WS_BASE_URL=${VITE_WS_BASE_URL}
ENV VITE_APP_NAME=${VITE_APP_NAME}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}

RUN npm run build && ls -la dist/

# Production stage - simple, no COPY from build
FROM nginx:1.26.2-alpine
RUN echo '<h1>build test OK</h1>' > /usr/share/nginx/html/index.html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
