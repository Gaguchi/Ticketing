# Minimal test - no build, just nginx
FROM nginx:1.26.2-alpine

RUN echo '<h1>Frontend Test OK</h1>' > /usr/share/nginx/html/index.html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
