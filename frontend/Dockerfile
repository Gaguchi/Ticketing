# Stage 1: Build the Vite application
FROM node:18-alpine AS build-stage

# Ensure necessary build tools and permissions
RUN apk add --no-cache bash git python3 make g++
WORKDIR /app

# Copy package manifests first for better caching
COPY package.json package-lock.json ./

# Use npm ci for reproducible installs
RUN npm ci --silent

# Copy rest of the source
COPY . .

# Ensure node_modules binaries are executable
RUN chmod -R a+rx node_modules/.bin || true

# Make sure files are owned by the non-root `node` user and switch to it
RUN chown -R node:node /app
USER node

# Build the app as non-root
RUN npm run build

# Stage 2: Serve the compiled application with Nginx
FROM nginx:1.26.2-alpine
COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 80

COPY nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
