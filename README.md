# Rentar - Sistema Distribuido

Sistema de alquiler de vehículos. Trabajo práctico de la materia **Desarrollo de Software en Sistemas Distribuidos** (UNLa).

## Stack

- **Backend:** NestJS + TypeScript + TypeORM + PostgreSQL + GraphQL (Apollo)
- **Frontend:** React + Vite
- **Infraestructura:** Docker Compose

## Cómo levantar el proyecto (para el equipo)

### Requisitos previos

- Tener instalado **Docker Desktop** y dejarlo **corriendo** (el ícono de la ballena tiene que estar activo). No hace falta instalar Node, PostgreSQL ni nada más en tu máquina.

### Paso a paso

1. Cloná el repositorio (o hacé `git pull` si ya lo tenías clonado) y parate en la rama `desarrollo`:

   ```bash
   git clone <url-del-repo>
   cd rentar-sistema-distribuido
   git checkout desarrollo
   git pull
   ```

2. Copiá el archivo de variables de entorno de ejemplo (no hace falta editar nada adentro):

   ```bash
   cp backend/.env.example backend/.env
   ```

3. Levantá todo con un solo comando:

   ```bash
   docker compose up --build
   ```

   Esto levanta 4 servicios: la base de datos PostgreSQL, Adminer, el backend NestJS y el frontend React. La primera vez tarda un par de minutos (instala dependencias dentro de los contenedores); las siguientes veces es mucho más rápido.

4. Cuando termine de levantar, vas a tener disponible:

   | Servicio  | URL                          | Notas                          |
   |-----------|------------------------------|---------------------------------|
   | Frontend  | http://localhost:5173        |                                  |
   | Backend   | http://localhost:3000        | API REST + GraphQL              |
   | Adminer   | http://localhost:8080        | Ver tabla de abajo para entrar  |
   | Postgres  | localhost:5432               | Para conectarte con un cliente externo (DBeaver, etc.) |

   Para entrar a **Adminer** y ver la base de datos, usá estas credenciales:

   | Campo              | Valor         |
   |--------------------|---------------|
   | Sistema            | PostgreSQL    |
   | Servidor           | `db`          |
   | Usuario            | `rentar`      |
   | Contraseña         | `rentar`      |
   | Base de datos      | `rentar_db`   |

5. Para bajar todo: `Ctrl+C` en la terminal donde quedó corriendo, y después:

   ```bash
   docker compose down
   ```

   Si además querés borrar los datos de la base (empezar de cero), usá `docker compose down -v`.

> ⚠️ **Todavía no hay lógica de negocio implementada.** Este esqueleto solo deja funcionando la infraestructura (Docker, NestJS conectado a Postgres, GraphQL registrado). Cada caso de uso (vehículos, clientes, reservas, disponibilidad) se va a desarrollar en su propia rama `feature/...` partiendo de `desarrollo`.

## Hot reload

Tanto el backend como el frontend corren montados como volúmenes dentro de sus contenedores, así que los cambios que hagas en el código se reflejan automáticamente sin necesidad de reconstruir las imágenes.

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
