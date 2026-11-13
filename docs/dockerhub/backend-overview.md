# TaskFlow Backend

API REST para gestionar tareas, desarrollada con **Node.js, TypeScript, Express y PostgreSQL**. Imagen construida por etapas y ejecutada como usuario `node`, sin las dependencias de desarrollo en la etapa final.

## Funcionalidades

- Crear, listar, consultar, editar y eliminar tareas.
- Estados `Pending`, `In Progress` y `Completed`.
- Validación de entradas y respuestas de error JSON.
- Persistencia en PostgreSQL mediante consultas parametrizadas.
- Migración inicial incluida y endpoints de salud.

## Etiquetas y plataformas

| Etiqueta | Uso |
|---|---|
| `1.0.0` | Versión publicada para ejecutar este ejemplo. |
| `latest` | Etiqueta móvil; puede apuntar a otra versión en el futuro. |

Plataformas publicadas: **`linux/amd64` y `linux/arm64`**. Docker selecciona la variante adecuada para la plataforma compatible. Para documentar una ejecución, utiliza una versión explícita; las etiquetas pueden ser reasignadas, y un digest identifica el contenido exacto.

## Configuración de la API

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Obligatoria. URL de PostgreSQL; el servidor y la base deben existir. |
| `HOST` | Usar `0.0.0.0` para aceptar conexiones entre contenedores. |
| `PORT` | Puerto interno; por defecto `3000`. |
| `CORS_ORIGIN` | Origen permitido; el ejemplo utiliza `http://localhost:8080`. |

No incluye un servidor PostgreSQL dentro de la imagen. En Compose, la conexión apunta al nombre del servicio `db`, no a `localhost`.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Proceso HTTP disponible. |
| GET | `/ready` | Conexión con PostgreSQL y tabla de tareas disponibles. |
| GET | `/api/tasks` | Listar tareas. |
| POST | `/api/tasks` | Crear una tarea. |
| GET | `/api/tasks/:id` | Consultar una tarea. |
| PATCH | `/api/tasks/:id` | Actualizar campos o estado. |
| DELETE | `/api/tasks/:id` | Eliminar una tarea. |

Ejemplo de cuerpo para crear una tarea:

```json
{
  "title": "Validar las imágenes publicadas",
  "description": "Levantar TaskFlow desde Docker Hub",
  "status": "Pending"
}
```

Título obligatorio de 1–120 caracteres; descripción opcional de hasta 2000. El servidor genera UUID y fecha de creación. Contrato completo: [OpenAPI](https://github.com/Romulozz/TaskFlow/blob/main/backend/openapi.json).

## Migraciones

El comando predeterminado inicia la API con `node dist/server.js`. Para preparar el esquema, la imagen también incluye:

```sh
npm run db:migrate:prod
```

El ejemplo siguiente lo ejecuta en un servicio puntual antes del backend. La migración inicial puede repetirse sin borrar tareas; no es un sistema completo de migraciones versionadas para futuros cambios de columnas.

## Inicio rápido con Docker Compose

Requiere Docker y Docker Compose. Este ejemplo descarga las imágenes publicadas: no necesita Node.js instalado, código fuente ni Dockerfiles.

En una carpeta nueva, crea un archivo `.env`:

```dotenv
POSTGRES_PASSWORD=REEMPLAZA_CON_UNA_CLAVE_LOCAL
```

Sustituye ese valor por una contraseña local. Para este ejemplo, utiliza una contraseña aleatoria con caracteres alfanuméricos, ya que se inserta en una URL de conexión. No publiques `.env` en Git. Para contraseñas con caracteres reservados de URL se necesita codificar su representación en `DATABASE_URL`.

Crea `compose.yaml`:

```yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: taskflow
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Define POSTGRES_PASSWORD en .env}
      POSTGRES_DB: taskflow
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U taskflow -d taskflow"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 10s

  migrate:
    image: romulozz/taskflow-backend:1.0.0
    environment:
      DATABASE_URL: postgresql://taskflow:${POSTGRES_PASSWORD}@db:5432/taskflow
    command: ["npm", "run", "db:migrate:prod"]
    depends_on:
      db:
        condition: service_healthy
    restart: "no"

  backend:
    image: romulozz/taskflow-backend:1.0.0
    environment:
      HOST: 0.0.0.0
      PORT: 3000
      DATABASE_URL: postgresql://taskflow:${POSTGRES_PASSWORD}@db:5432/taskflow
      CORS_ORIGIN: http://localhost:8080
    depends_on:
      migrate:
        condition: service_completed_successfully
    restart: unless-stopped

  frontend:
    image: romulozz/taskflow-frontend:1.0.0
    ports:
      - "127.0.0.1:8080:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  db-data:

```

Ejecuta desde esa carpeta:

```sh
docker compose pull
docker compose up -d
docker compose ps -a
```

Abre **http://localhost:8080**. Puedes comprobar la comunicación con la API mediante:

```sh
curl --fail http://localhost:8080/api/tasks
```

Se espera JSON, incluso `[]` cuando todavía no hay tareas. PostgreSQL debe estar saludable, `migrate` debe terminar con código 0 y los servicios backend/frontend deben permanecer ejecutándose. `Exited (0)` en `migrate` es normal.

Para revisar errores:

```sh
docker compose logs --tail=50 db migrate backend frontend
```

El healthcheck de PostgreSQL comprueba disponibilidad; la migración crea el esquema antes del arranque de la API. Si esta falla, consulta sus logs. Nginx podría devolver un error transitorio mientras la API termina de iniciar.

## Persistencia y limpieza

Las tareas se guardan en el volumen `db-data`. `docker compose down` elimina los contenedores y la red, pero conserva ese volumen. Un nuevo `docker compose up -d` reutiliza los datos.

**`docker compose down -v` elimina el volumen y todas las tareas.** Úsalo únicamente para descartar un entorno de prueba. Cambiar `POSTGRES_PASSWORD` en `.env` no cambia la contraseña de una base ya inicializada.

## Alcance

Proyecto de aprendizaje y portfolio Cloud/DevOps, sin autenticación ni separación de usuarios. El ejemplo limita la publicación HTTP al equipo local y no publica PostgreSQL ni la API directamente. No está preparado como despliegue productivo. El usuario inicial de PostgreSQL es administrador de la base del laboratorio; un entorno productivo requiere separar permisos de administración, migración y ejecución.

Código fuente y documentación: [Romulozz/TaskFlow en GitHub](https://github.com/Romulozz/TaskFlow).
Problemas y sugerencias: [GitHub Issues](https://github.com/Romulozz/TaskFlow/issues).
