# TaskFlow

MVP local: React + TypeScript → API Express → PostgreSQL.

## Iniciar la aplicación

Requisitos: Node.js 22.12+ y PostgreSQL activo con una base de datos y usuario propios.

### 1. Backend

```sh
cd backend
npm install
cp .env.example .env
```

Edita `backend/.env` con tu `DATABASE_URL` real. Después, desde `backend`:

```sh
npm run db:migrate
npm run dev
```

La API escucha en `http://127.0.0.1:3000`. `/ready` comprueba la base y el esquema.

### 2. Frontend, en otra terminal

```sh
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`. Vite envía `/api` a `http://127.0.0.1:3000`. No necesitas un `.env` del frontend con los puertos predeterminados. Para cambiar el destino, copia `frontend/.env.example` a `frontend/.env` y ajusta `API_PROXY_TARGET`.

Todas las operaciones se confirman con la API antes de cambiar el tablero. Durante el guardado se bloquean envíos repetidos. Si una solicitud falla, se conservan los datos visibles y se ofrece recargar desde el servidor; no se reintentan escrituras automáticamente.

Las tareas de la versión inicial permanecen en `localStorage`, pero esta versión no las lee ni las importa. No se borran esos datos. El servidor es ahora la fuente de tareas.

## Comprobaciones

```sh
npm run build --prefix frontend
npm run build --prefix backend
npm test --prefix backend
```

La prueba de integración importa el cliente HTTP real del frontend y lo ejecuta contra Vite, Express y una base PGlite temporal. Requiere las dependencias de ambas carpetas. Cubre crear, listar, editar, cambiar estado, volver a consultar, eliminar, validación y caída de la API. Las otras pruebas cubren persistencia tras reabrir la base. Esto no sustituye una prueba visual en navegador ni la conexión del driver `pg` con PostgreSQL externo.

## Compilación y configuración

`npm run preview` del frontend también incluye el proxy local. Al alojar `frontend/dist` en otro servidor, configura un proxy `/api` hacia el backend o define `VITE_API_URL` (con `/api`) antes de compilar y ajusta `CORS_ORIGIN` en el backend. Las variables `VITE_*` son públicas: no incluyas secretos.

Este MVP no tiene autenticación y se utiliza localmente. Docker, Kubernetes y despliegue cloud pertenecen a fases posteriores.

Más detalles: [backend](backend/README.md), [frontend](frontend/README.md) y [contrato OpenAPI](backend/openapi.json).
