# Test: tsc only (no vite build)
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx tsc -b

# Production stage
FROM nginx:1.26.2-alpine
RUN echo '<h1>tsc test OK</h1>' > /usr/share/nginx/html/index.html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
