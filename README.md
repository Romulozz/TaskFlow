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

## Backend con Docker y PostgreSQL en el equipo local

Esta etapa utiliza Docker Desktop en macOS: el backend corre en un contenedor y PostgreSQL sigue instalado en el equipo. El frontend continúa ejecutándose con Vite como se describe arriba.

### Construir la imagen

Desde la raíz del repositorio:

```sh
cd backend
docker build -t backend:latest .
```

El Dockerfile separa dependencias de desarrollo, pruebas/compilación, dependencias de ejecución y runner. Durante la construcción ejecuta `test:backend`; no ejecuta la prueba de integración con Vite. La etapa final contiene JavaScript compilado, dependencias de ejecución, migraciones y `package.json`, y utiliza el usuario `node`.

### Preparar las variables del contenedor

Desde `backend`, crea `.env.local` si todavía no existe:

```sh
cp -n .env.example .env.local
```

Edita ese archivo con estos campos, sustituyendo `TU_CONTRASENA` por tu contraseña local:

```dotenv
HOST=0.0.0.0
PORT=3000
DATABASE_URL=postgresql://taskflow:TU_CONTRASENA@host.docker.internal:5432/taskflow
CORS_ORIGIN=http://localhost:5173
```

`.env.local` está excluido de Git y del contexto de Docker. No publiques el archivo ni pegues credenciales reales en el README. Si la contraseña contiene caracteres especiales, codifícalos para una URL.

`host.docker.internal` permite alcanzar el equipo anfitrión desde Docker Desktop. PostgreSQL debe estar iniciado y permitir la conexión de la aplicación; no desactives la autenticación para resolver un fallo de conexión. `HOST=0.0.0.0` permite que Express reciba tráfico dentro del contenedor.

### Preparar una base nueva

La base y el usuario deben existir antes de ejecutar la migración. Para crear la tabla usando la imagen:

```sh
docker run --rm \
  --env-file .env.local \
  backend:latest npm run db:migrate:prod
```

Este contenedor ejecuta `dist/migrate.js` y termina. El arranque normal de la API no ejecuta migraciones automáticamente. Para probar desde cero, utiliza una base separada, por ejemplo `taskflow_migration_test`, y cambia el nombre de base en una copia local del archivo de variables; no borres las tareas de tu base habitual.

### Iniciar la API

```sh
docker run --rm \
  --name taskflow-backend \
  --env-file .env.local \
  -p 127.0.0.1:3000:3000 \
  backend:latest
```

El comando deja los logs visibles. `Ctrl+C` detiene el proceso y `--rm` elimina ese contenedor al salir; los datos permanecen en PostgreSQL, fuera del contenedor. Detén el backend local si ya está ocupando el puerto 3000. La publicación se limita al equipo local, mientras Express escucha en todas las interfaces del contenedor. No dejes espacios después de las barras `\` de continuación de línea.

En otra terminal puedes comprobar la disponibilidad:

```sh
curl --fail http://127.0.0.1:3000/ready
```

El frontend usa el mismo destino de API, por lo que no requiere cambios para este modo.

### Estado de validación

- Se probó una versión anterior de la imagen contra PostgreSQL del equipo local.
- Pendiente: reconstruir y validar la versión final con `USER node`, comprobar su usuario efectivo, ejecutar la migración en una base vacía y verificar el CRUD.
- La configuración del Dockerfile ha sido revisada; esas pruebas pendientes no se consideran completadas.

## Comprobaciones

```sh
npm run build --prefix frontend
npm run build --prefix backend
npm test --prefix backend
```

La prueba de integración importa el cliente HTTP real del frontend y lo ejecuta contra Vite, Express y una base PGlite temporal. Requiere las dependencias de ambas carpetas. Cubre crear, listar, editar, cambiar estado, volver a consultar, eliminar, validación y caída de la API. Las otras pruebas cubren persistencia tras reabrir la base. Esto no sustituye una prueba visual en navegador ni la conexión del driver `pg` con PostgreSQL externo.

## Compilación y configuración

`npm run preview` del frontend también incluye el proxy local. Al alojar `frontend/dist` en otro servidor, configura un proxy `/api` hacia el backend o define `VITE_API_URL` (con `/api`) antes de compilar y ajusta `CORS_ORIGIN` en el backend. Las variables `VITE_*` son públicas: no incluyas secretos.

Este MVP no tiene autenticación y se utiliza localmente. La containerización del backend está en progreso. Quedan pendientes el frontend y PostgreSQL en contenedores, la integración con Compose, Kubernetes y el despliegue cloud.

Más detalles: [backend](backend/README.md), [frontend](frontend/README.md) y [contrato OpenAPI](backend/openapi.json).
