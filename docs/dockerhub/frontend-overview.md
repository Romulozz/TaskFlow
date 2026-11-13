# TaskFlow Frontend

Interfaz web de gestión de tareas creada con **React, TypeScript y Vite**, compilada y servida mediante **Nginx**. La imagen final contiene los archivos estáticos y la configuración del proxy; no necesita ejecutar el servidor de desarrollo de Vite.

## Funcionalidades

- Crear, editar y eliminar tareas.
- Tablero por estados y vista de lista.
- Cambiar estados mediante selector o arrastrando tarjetas.
- Búsqueda, filtros y resumen de progreso.
- Interfaz en español y diseño adaptable.

## Etiquetas y plataformas

| Etiqueta | Uso |
|---|---|
| `1.0.0` | Versión publicada para ejecutar este ejemplo. |
| `latest` | Etiqueta móvil; puede apuntar a otra versión en el futuro. |

Plataformas publicadas: **`linux/amd64` y `linux/arm64`**. Docker selecciona la variante adecuada para la plataforma compatible. Para documentar una ejecución, utiliza una versión explícita; las etiquetas pueden ser reasignadas, y un digest identifica el contenido exacto.

## Comunicación con el backend

Nginx escucha en el puerto interno **80**:

```text
Navegador → Nginx
              ├── /       → frontend compilado
              └── /api/   → http://backend:3000
```

La imagen espera un backend accesible con el nombre **`backend`**, en el puerto **3000**, dentro de su red Docker. El ejemplo de Compose configura esa relación. Ejecutar esta imagen sola sin ese nombre resoluble puede impedir el arranque de Nginx.

El prefijo `/api/` se conserva al reenviar solicitudes. El navegador no necesita conocer los nombres internos de los contenedores. Las tareas se guardan en PostgreSQL a través de la API; no se almacenan en el contenedor frontend.

## Configuración

Publica el puerto 80 del contenedor en un puerto del equipo, por ejemplo `127.0.0.1:8080:80`. La imagen usa `/api` y el proxy incluido; no necesita una variable `VITE_API_URL` al iniciar.

Las variables `VITE_*` se incorporan durante la compilación. Pasarlas con `docker run -e` no modifica los archivos ya compilados. Para cambiar el destino del proxy, proporciona una configuración de Nginx adecuada o reconstruye la imagen con ella.

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
