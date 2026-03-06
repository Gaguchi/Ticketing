# Test: node stage with npm ci only (no build)
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

# Production stage
FROM nginx:1.26.2-alpine
RUN echo '<h1>npm ci test OK</h1>' > /usr/share/nginx/html/index.html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
