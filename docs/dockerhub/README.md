# Textos para Docker Hub

Preparados a partir del código del proyecto y de las etiquetas/plataformas reportadas por el usuario. El usuario confirmó el funcionamiento de las imágenes publicadas mediante `compose.hub.yml`. No se verificaron aquí los manifests remotos, ambas arquitecturas por separado ni una ejecución en un equipo completamente limpio. Estos textos no se publicaron automáticamente en Docker Hub.

## romulozz/taskflow-backend

Descripción corta (campo «Add a description»):

> API REST de tareas con Node.js, Express y PostgreSQL. Migraciones incluidas. Compatible con amd64 y arm64.

Repository overview: copiar el contenido completo de [backend-overview.md](backend-overview.md).

## romulozz/taskflow-frontend

Descripción corta (campo «Add a description»):

> Gestor de tareas con React y TypeScript, servido por Nginx con proxy a la API. Compatible con amd64 y arm64.

Repository overview: copiar el contenido completo de [frontend-overview.md](frontend-overview.md).

Las etiquetas 1.0.0/latest pertenecen a las imágenes; no se cambia automáticamente la versión del package.json al etiquetar una imagen.

El Compose de los overviews utiliza solo imágenes publicadas, nombres y volúmenes propios del proyecto y publicación HTTP en loopback. Es un ejemplo independiente del Compose de desarrollo de la raíz. Para probarlo mientras el entorno de desarrollo está activo, evita conflictos de puerto y utiliza otro nombre de proyecto. No borres volúmenes existentes para hacer esta comprobación.
