# Single stage - forces build to actually run
FROM node:20-alpine

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

# Capture build output - continue even if build fails
RUN npm run build 2>&1 > /tmp/build.log; echo "EXIT_CODE=$?" >> /tmp/build.log; cat /tmp/build.log; test -d dist

EXPOSE 80
CMD ["cat", "/tmp/build.log"]
