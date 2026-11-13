# TaskFlow

MVP de gestión de tareas: React + TypeScript → Nginx → API Express → PostgreSQL.

## Estado del proyecto

La aplicación está integrada mediante Docker Compose, con imágenes propias para frontend y backend, migración automática y datos persistidos en un volumen. El usuario confirmó el CRUD desde la interfaz y la conservación de tareas después de `docker compose down` y un nuevo arranque. La configuración externa se revisó sin exponer credenciales.

La Fase 1 tiene el flujo funcional y la persistencia verificados por el usuario. En Fase 2 se publicaron las imágenes de frontend y backend con etiquetas `1.0.0` y `latest`, y el usuario confirmó el funcionamiento del conjunto mediante `compose.hub.yml`, sin construcción local. Plataformas reportadas: `linux/amd64` y `linux/arm64`.

La publicación y la prueba funcional desde Docker Hub están realizadas. No se ha registrado evidencia independiente de una ejecución en un equipo completamente limpio ni de una prueba en cada arquitectura. La prueba aislada desde una base inicialmente vacía tampoco se ha certificado por separado. Se conserva esta distinción antes de declarar verificado todo el criterio de entorno limpio de la Fase 2.

## Arquitectura

```text
Navegador → localhost:8080 → frontend (Nginx:80)
                              ├── /       → archivos de dist
                              └── /api/   → backend:3000 → db:5432
                                                           └── volumen postgres-db

Arranque de la API: db healthy → migrate termina con código 0 → backend
```

Frontend, backend y base comparten la red predeterminada de Compose. `migrate` usa la imagen del backend y ejecuta una tarea puntual. `Exited (0)` en ese servicio es el resultado correcto.

## Iniciar con Docker Compose

Requiere Docker y Docker Compose; en macOS, Docker Desktop iniciado. No necesitas instalar Node.js ni PostgreSQL en el equipo para esta modalidad. Ejecuta los comandos desde la raíz del repositorio.

### 1. Configurar las variables locales

Crea un archivo `.env` en la raíz (no sobrescribas uno existente):

```dotenv
POSTGRES_PWD=REEMPLAZAR_POR_TU_CONTRASENA
POSTGRES_USER=postgres
POSTGRES_DB=taskflow
```

Compose utiliza este archivo para sustituir `${POSTGRES_PWD}`, `${POSTGRES_USER}` y `${POSTGRES_DB}` en el YAML. El ejemplo usa `postgres`; si eliges otro usuario, actualiza también `DATABASE_URL`.

Crea o ajusta `backend/.env`:

```dotenv
HOST=0.0.0.0
PORT=3000
DATABASE_URL=postgresql://postgres:REEMPLAZAR_POR_TU_CONTRASENA@db:5432/taskflow
CORS_ORIGIN=http://localhost:8080
```

Usa la misma contraseña y base en ambos archivos. Codifica los caracteres especiales de la contraseña para incluirlos en `DATABASE_URL`. La raíz `.env` sirve para la interpolación de Compose; `env_file: ./backend/.env` inyecta las variables en backend y migrate. No son intercambiables.

Ambos archivos están ignorados por Git. No subas credenciales ni las incorpores a las imágenes. Las variables `VITE_*` son públicas y se incorporan al compilar; nunca deben contener secretos.

Las variables de inicialización de PostgreSQL crean la base y el usuario cuando el volumen está vacío. Cambiarlas después no cambia automáticamente las credenciales de una base ya inicializada.

### 2. Validar y levantar

```sh
docker compose config --quiet
docker compose up --build
```

El healthcheck comprueba que PostgreSQL acepta conexiones. Después `migrate` ejecuta `npm run db:migrate:prod` y, si termina correctamente, se inicia el backend. La migración inicial crea `tasks` sin borrar datos existentes; no es todavía un sistema de migraciones versionadas para cambios futuros de esquema.

Abre **http://localhost:8080**. Para ejecutar en segundo plano, utiliza `docker compose up -d --build`.

### 3. Comprobar y diagnosticar

```sh
docker compose ps -a
docker compose logs --tail=50 db migrate backend frontend
curl --fail http://localhost:3000/ready
curl --fail http://localhost:8080/api/tasks
```

La segunda petición atraviesa Nginx y debe devolver JSON de la API. El CRUD y los cambios de estado, incluido arrastrar tarjetas, se confirman con el servidor antes de actualizar la interfaz.

Puertos publicados actualmente:

| Servicio | Equipo | Contenedor | Uso |
|---|---|---|---|
| Frontend | 8080 | 80 | Interfaz y proxy de la API |
| Backend | 3000 | 3000 | Diagnóstico directo |
| PostgreSQL | 5432 | 5432 | Cliente SQL como TablePlus |

Los mapeos actuales no se restringen a loopback. Este entorno es un laboratorio local sin autenticación; no se presenta como despliegue productivo. Para limitar el acceso al equipo, publica en `127.0.0.1`. Backend y base no necesitan publicar puertos para comunicarse internamente.

En TablePlus utiliza host `127.0.0.1`, puerto `5432`, el usuario de `POSTGRES_USER`, la base de `.env` y su contraseña local. Desde los contenedores, la base se alcanza mediante `db`, no `localhost`.

## Ejecutar las imágenes publicadas en Docker Hub

| Componente | Imagen usada por Compose |
|---|---|
| Backend y migraciones | `romulozz/taskflow-backend:1.0.0` |
| Frontend | `romulozz/taskflow-frontend:1.0.0` |
| PostgreSQL | `postgres:17-alpine` |

Repositorios: [backend](https://hub.docker.com/r/romulozz/taskflow-backend) y [frontend](https://hub.docker.com/r/romulozz/taskflow-frontend). Se publicaron `1.0.0` y `latest`; el Compose utiliza la versión explícita. No hace falta cambiar el código para asignar la primera versión a una imagen. `latest` es una etiqueta móvil, no una versión adicional.

`compose.hub.yml` no contiene `build`: permite arrancar con las imágenes publicadas, sin utilizar los Dockerfiles ni compilar. Sí necesita el archivo Compose y la configuración local `.env` y `backend/.env` descrita arriba.

Para cambiar del entorno de construcción local al de Docker Hub, desde la raíz:

```sh
docker compose -f docker-compose.yml down
docker compose -f compose.hub.yml config --quiet
docker compose -f compose.hub.yml pull
docker compose -f compose.hub.yml up -d
docker compose -f compose.hub.yml ps -a
```

No ejecutes ambos simultáneamente con los mismos puertos. Abre http://localhost:8080 y comprueba las tareas. Para diagnosticar o detener esta modalidad, indica siempre el archivo:

```sh
docker compose -f compose.hub.yml logs --tail=50 migrate backend frontend
docker compose -f compose.hub.yml down
```

**Diferencia de volúmenes:** el Compose de desarrollo declara el nombre fijo `postgres-db`. El archivo de Docker Hub omite ese nombre y utiliza un volumen con prefijo de proyecto, por ejemplo `taskflow_postgres-db`. Por tanto, puede presentar una base distinta de la anterior; no mueve ni elimina automáticamente sus datos. Solo será una base vacía si ese volumen no existía previamente. `down` sin `-v` conserva los datos de la modalidad utilizada.

El usuario confirmó que la ejecución con este archivo funciona. No se realizó una nueva prueba de arranque durante la actualización documental ni se verificaron los manifests remotos. Los textos preparados para las fichas de Docker Hub están en [docs/dockerhub](docs/dockerhub/README.md).

## Persistencia y limpieza

```sh
docker compose down
docker compose up -d
```

`down` elimina contenedores y red, pero conserva el volumen `postgres-db`. Se confirmó manualmente que las tareas reaparecen tras este ciclo.

**`docker compose down -v` elimina el volumen y los datos.** No lo uses para reiniciar normalmente ni para solucionar errores. Prueba bases vacías en un entorno aislado. El volumen tiene un nombre explícito, por lo que cambiar solo el nombre del proyecto Compose no basta para aislarlo.

## Problemas resueltos

### Backend reiniciándose por tablas faltantes

PostgreSQL creaba la base, pero la tabla de tareas aún no existía. `depends_on` en forma corta no esperaba disponibilidad ni migraciones. Se añadieron un healthcheck, el servicio `migrate` y las condiciones `service_healthy` y `service_completed_successfully`.

### Frontend sin conexión a la API

El proxy de Vite no se incluye en `dist`. Nginx ahora reenvía `/api/` a `http://backend:3000`, conservando el prefijo. Su configuración está en `frontend/nginx/nginx.conf` y se copia a la imagen.

### Contenedor con una imagen anterior

El usuario detectó que el contenedor seguía usando una imagen que no incluía el archivo de Nginx. Reconstruir y recrear el frontend resolvió el problema:

```sh
docker compose up -d --build frontend
```

Reiniciar un contenedor no incorpora cambios en archivos copiados con `COPY`. El usuario confirmó después el funcionamiento de la interfaz y todas las operaciones de tareas.

## Desarrollo y pruebas fuera de contenedores

Requiere Node.js 22.12+ y dependencias de ambas carpetas:

```sh
npm ci --prefix frontend
npm ci --prefix backend
npm run build --prefix frontend
npm run build --prefix backend
npm test --prefix backend
```

Las pruebas usan PGlite temporal; no modifican la base de Compose. Incluyen CRUD, validaciones, persistencia tras reabrir la base y cliente HTTP → Vite → Express. La construcción Docker del backend ejecuta solo `test:backend`, porque su contexto no incluye el frontend.

Para desarrollar únicamente el frontend con Vite mientras backend y db siguen en Compose:

```sh
npm run dev --prefix frontend
```

Abre `http://localhost:5173`. Vite reenvía `/api` a `127.0.0.1:3000`. Si ejecutas también el backend fuera de Docker, detén el backend del contenedor para liberar el puerto y utiliza una conexión a `127.0.0.1:5432`, no a `db`. No sobrescribas la configuración destinada a Compose sin conservarla.

Las tareas antiguas de la primera versión en localStorage no se importan automáticamente; PostgreSQL es la fuente de datos actual.

Más detalles: [backend](backend/README.md), [frontend](frontend/README.md) y [contrato OpenAPI](backend/openapi.json).
