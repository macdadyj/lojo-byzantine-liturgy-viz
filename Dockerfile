# Static Divine Liturgy walkthrough for Cloud Run.
# Stage 1 builds dist/. Stage 2 serves it with nginx on 8080 (Cloud Run's PORT).
# No secrets, API keys, or runtime credentials are copied into the image.

FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

RUN test -s /usr/share/nginx/html/index.html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
