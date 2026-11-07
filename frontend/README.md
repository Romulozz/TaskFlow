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
