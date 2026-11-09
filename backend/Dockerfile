# Dependencias de desarrollo
FROM node:24.22-alpine3.23 AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build y test
FROM node:24.22-alpine3.23 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run test:backend
RUN npx tsc

# Producción
FROM node:24.22-alpine3.23 AS prod
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Runner
FROM node:24.22-alpine3.23 AS runner
WORKDIR /app
COPY --from=prod /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist/
COPY --from=build /app/migrations ./migrations/
COPY --from=build /app/package.json ./package.json
USER node
CMD ["node", "dist/server.js"]
