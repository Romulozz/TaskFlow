# TaskFlow · Frontend

React, TypeScript y Vite. Gestor de tareas conectado a la API REST del proyecto.

## Ejecutar

Desde esta carpeta: `npm install` y `npm run dev`. Abre `http://localhost:5173`.
Primero inicia el backend y su base PostgreSQL como indica el [README principal](../README.md).

Vite redirige `/api` al backend en `http://127.0.0.1:3000`. Para cambiarlo, copia `.env.example` a `.env` y ajusta `API_PROXY_TARGET`. `VITE_API_URL` permite usar una API directamente; se incorpora al compilar y requiere CORS adecuado en el backend.

## Funcionalidad

- Crear, listar, editar y eliminar tareas, con confirmación al eliminar.
- Estados `Pending`, `In Progress`, `Completed`, con etiquetas en español.
- Tablero/lista, búsqueda, filtros y progreso.
- Arrastrar tarjetas entre columnas del tablero cambia el estado mediante la API. El selector sigue disponible para teclado y pantallas táctiles.
- Carga inicial desde la API, estados de carga/guardado, mensajes de error y recarga manual.
- Cambios visibles solo después de recibir confirmación del servidor.
- Persistencia en PostgreSQL a través de la API. No usa `localStorage` ni elimina las tareas antiguas allí guardadas.

## Estructura

- `src/api.ts`: cliente HTTP con timeout y manejo de errores.
- `src/useTasks.ts`: estado remoto, bloqueo de operaciones simultáneas y actualización de tareas.
- `src/storage.ts`: tipos y estados de tareas (ya no contiene almacenamiento local).
- `src/App.tsx`: interfaz y formularios.
- `src/styles.css`: diseño adaptable.

`npm run build` compila y comprueba TypeScript. `npm run preview` sirve la compilación con el proxy local. La prueba de integración está en `../backend/test/frontend-integration.test.ts`; ejecutar `npm test --prefix ../backend`.

La tipografía de Google Fonts es opcional; se usa una fuente del sistema sin conexión.

## Imagen Docker del frontend (en progreso)

El Dockerfile usa tres etapas: `deps` instala dependencias con `npm ci`, `builder` comprueba TypeScript y genera `dist`, y `deploy` sirve los archivos compilados con Nginx. La imagen final no incluye Node.js ni las dependencias de desarrollo.

Desde la carpeta `frontend`, los comandos previstos para construir y abrir la interfaz son:

```sh
docker build -t taskflow-frontend:latest .
docker run --rm \
  --name taskflow-frontend \
  -p 127.0.0.1:8080:80 \
  taskflow-frontend:latest
```

Abre `http://localhost:8080`. El puerto se publica solo en el equipo local. `EXPOSE 80` documenta el puerto interno, pero no lo publica por sí mismo.

### Estado actual y pendientes

El Dockerfile ha sido revisado estáticamente; su construcción y ejecución con la etiqueta de Nginx seleccionada todavía no se han verificado en esta entrega.

**La conexión a la API desde Nginx está pendiente.** El cliente utiliza `/api`, pero el proxy de `vite.config.ts` solo funciona con los servidores de Vite; no se incluye en `dist`. Actualmente la imagen no contiene una configuración personalizada de Nginx que reenvíe esas peticiones. Cargar la interfaz no demuestra que el CRUD funcione en este modo.

El próximo paso es configurar Nginx y Docker Compose para conectar frontend y backend por el nombre del servicio backend y su puerto interno `3000`. Se mantendrá PostgreSQL en el equipo al principio y después se incorporará como tercer servicio con persistencia y migraciones.

`VITE_API_URL`, si se utiliza, se incorpora durante la compilación. Pasarla como variable al iniciar el contenedor Nginx no modifica automáticamente los archivos ya compilados. No incluyas secretos en variables `VITE_*`.

Antes de cerrar esta etapa, comprobar que la interfaz carga, `/api/tasks` devuelve JSON del backend, todas las operaciones CRUD funcionan y las tareas permanecen tras recargar. La ejecución local con Vite sigue disponible mientras se completa esta integración.
