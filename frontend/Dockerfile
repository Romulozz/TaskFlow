# Instalar dependencias
FROM node:24.22-alpine3.23 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Construir la aplicación
FROM node:24.22-alpine3.23 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Desplegar la aplicación
FROM nginx:alpine3.24-slim AS deploy
COPY --from=builder /app/dist ./usr/share/nginx/html
EXPOSE 80
