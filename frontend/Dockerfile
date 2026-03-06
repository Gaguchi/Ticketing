# Diagnostic: capture build error and serve it
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

RUN mkdir -p /app/dist && \
    (npm run build 2>&1 && echo "BUILD_SUCCESS" > /app/dist/build_status.txt || \
    (echo "BUILD_FAILED" > /app/dist/build_status.txt && \
     npm run build 2>&1 > /app/dist/error.html; true))

# Production stage
FROM nginx:1.26.2-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
