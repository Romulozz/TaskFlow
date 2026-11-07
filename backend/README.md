# TaskFlow · Backend

API REST local con Node.js, TypeScript, Express y PostgreSQL. El frontend está conectado a esta API mediante el proxy de Vite. Consulta el README principal para iniciar ambos proyectos.

## Preparación

Necesitas Node.js 22.12+ y un servidor PostgreSQL activo. Crea una base de datos `taskflow` y un usuario con permisos sobre ella usando tu administrador de PostgreSQL. No uses credenciales productivas.

Desde esta carpeta:

```sh
npm install
cp .env.example .env
```

Edita `DATABASE_URL` con tu conexión real. `.env` está ignorado por Git. Después:

```sh
npm run db:migrate
npm run dev
```

API por defecto: `http://127.0.0.1:3000`. Si falta la base de datos o la migración, el servidor informa del problema y no inicia. La migración inicial es transaccional, no elimina datos y puede repetirse; futuros cambios de esquema deben usar nuevas migraciones.

```sh
npm run build
npm start
npm test
```

`npm test` usa una base temporal PGlite (PostgreSQL embebido) y Supertest. No necesita tu servidor PostgreSQL ni modifica tus datos. Cubre CRUD HTTP, persistencia tras reabrir la base, validaciones, SQL parametrizado, restricciones SQL, errores, health checks y CORS. La conectividad del driver `pg` con un servidor externo debe verificarse por separado.

## Contrato

Definición formal: `openapi.json` (fuente de verdad del contrato).

| Método | Ruta | Resultado |
|---|---|---|
| GET | `/health` | 200: proceso disponible |
| GET | `/ready` | 200: base y tabla disponibles; 503 en caso contrario |
| GET | `/api/tasks` | 200: array de tareas, más recientes primero |
| POST | `/api/tasks` | 201: tarea creada; cabecera Location |
| GET | `/api/tasks/:id` | 200: tarea; 404 si no existe |
| PATCH | `/api/tasks/:id` | 200: tarea actualizada parcialmente |
| DELETE | `/api/tasks/:id` | 204 sin cuerpo; 404 si no existe |

Creación de ejemplo:

```json
{"title":"Preparar el MVP","description":"Revisar los criterios de aceptación","status":"Pending"}
```

Respuesta de tarea: `{ "id": "UUID", "title": "...", "description": "...", "status": "Pending", "createdAt": "fecha ISO 8601" }`.

- `title`: obligatorio al crear, 1–120 caracteres tras quitar espacios exteriores.
- `description`: opcional al crear, por defecto `""`, máximo 2000 caracteres; se quitan espacios exteriores.
- `status`: `Pending`, `In Progress` o `Completed`; por defecto `Pending`.
- PATCH requiere al menos un campo editable; los campos omitidos se conservan. Se admite cualquier transición entre los tres estados.
- Campos desconocidos, nulos, UUID inválido y JSON mal formado: 400.
- Cuerpo JSON máximo 16 KB; exceso: 413.
- Errores: `{ "error": { "code": "...", "message": "...", "details": [] } }`; `details` solo aparece en errores de validación.
- UUID y fecha los genera el servidor. Listado sin paginación para este MVP local.

## Configuración y alcance

- `HOST`: por defecto `127.0.0.1` (solo equipo local).
- `PORT`: por defecto `3000`.
- `DATABASE_URL`: obligatorio; conexión PostgreSQL. Para TLS, configura la conexión de acuerdo con tu servidor, sin desactivar validación de certificados.
- `CORS_ORIGIN`: por defecto `http://localhost:5173`; debe coincidir con la URL del frontend.

No hay autenticación, usuarios, cloud ni despliegue productivo. CORS no sustituye autenticación: la API está pensada para uso local y todas las tareas pertenecen al mismo espacio. No exponer públicamente sin añadir controles de acceso. El servidor usa consultas parametrizadas, cabeceras Helmet, límites de cuerpo y cierre ordenado de conexiones.

No se añaden contenedores todavía: corresponden a la siguiente fase del laboratorio. La integración con el cliente frontend se prueba por HTTP a través de Vite. Queda validar el flujo visual y ambos proyectos contra PostgreSQL real.
