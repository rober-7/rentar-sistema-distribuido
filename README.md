# Rentar - Sistema Distribuido

Sistema de alquiler de vehículos. Trabajo práctico de la materia **Desarrollo de Software en Sistemas Distribuidos** (UNLa).

## Stack

- **Backend:** NestJS + TypeScript + TypeORM + PostgreSQL + GraphQL (Apollo)
- **Frontend:** React + Vite
- **Infraestructura:** Docker Compose

## Requisitos

Lo único que necesitás instalado es **Docker Desktop**. No hace falta instalar Node, PostgreSQL ni nada más en tu máquina.

## Cómo levantar el proyecto

1. Cloná el repositorio y parate en la rama `desarrollo`:

   ```bash
   git clone <url-del-repo>
   cd rentar-sistema-distribuido
   git checkout desarrollo
   ```

2. Levantá todo con Docker Compose:

   ```bash
   docker compose up --build
   ```

3. Cuando termine de levantar, vas a tener disponible:

   | Servicio  | URL                          |
   |-----------|------------------------------|
   | Frontend  | http://localhost:5173        |
   | Backend   | http://localhost:3000        |
   | Adminer   | http://localhost:8080        |
   | Postgres  | localhost:5432               |

   Para entrar a Adminer y ver la base de datos: sistema `PostgreSQL`, servidor `db`, usuario `rentar`, contraseña `rentar`, base de datos `rentar_db`.

4. Para parar todo: `Ctrl+C` y después `docker compose down` (si además querés borrar los datos de la base, `docker compose down -v`).

## Hot reload

Tanto el backend como el frontend corren montados como volúmenes dentro de sus contenedores, así que los cambios que hagas en el código se reflejan automáticamente sin necesidad de reconstruir las imágenes.

## Variables de entorno

El backend usa un archivo `backend/.env` (ignorado por git). Si no existe, copialo desde el ejemplo:

```bash
cp backend/.env.example backend/.env
```

## Estructura del repo

```
.
├── backend/          # API NestJS (REST + GraphQL)
├── frontend/         # React + Vite
├── docker-compose.yml
└── README.md
```

## Organización del equipo

Cada funcionalidad se desarrolla en su propia rama feature a partir de `desarrollo`:

- Gestión de vehículos (ABM) → REST
- Gestión de clientes (ABM) → REST
- Alta y cancelación de reservas → REST
- Consulta de disponibilidad de vehículos (con filtros) → GraphQL
- Consulta de reservas (con filtros) → GraphQL
- Historial de alquileres → GraphQL
