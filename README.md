# Rentar - Sistema Distribuido

Sistema de alquiler de vehículos. Trabajo práctico de la materia **Desarrollo de Software en Sistemas Distribuidos** (UNLa).

## Stack

- **API Gateway:** NestJS + TypeScript + TypeORM + PostgreSQL + GraphQL (Apollo) — `backend/`
- **Vehicle Service:** Python + grpcio + SQLAlchemy — `services/vehicle-service/`
- **Customer Service:** Python + grpcio + SQLAlchemy — `services/customer-service/`
- **Rental Service:** Python + grpcio + SQLAlchemy — `services/rental-service/`
- **Comunicación Gateway ↔ servicios internos:** gRPC (contratos en `proto/`)
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

   Esto levanta PostgreSQL, Adminer, los tres servicios gRPC (Python), el API Gateway (NestJS) y el frontend React. La primera vez tarda un par de minutos (instala dependencias dentro de los contenedores); las siguientes veces es mucho más rápido.

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


   ### Acceso inicial

   En el primer inicio, el backend crea automáticamente un administrador si todavía no existe.

   | Campo | Valor |
   |---|---|
   | Email | `admin@rentar.com` |
   | Contraseña | Valor configurado en `ADMIN_PASSWORD` dentro de `backend/.env` |

5. Para bajar todo: `Ctrl+C` en la terminal donde quedó corriendo, y después:

   ```bash
   docker compose down
   ```

   Si además querés borrar los datos de la base (empezar de cero), usá `docker compose down -v`.

## Hot reload

Tanto el backend como el frontend corren montados como volúmenes dentro de sus contenedores, así que los cambios que hagas en el código se reflejan automáticamente sin necesidad de reconstruir las imágenes.

## Estructura del repo

```
.
├── backend/                     # API Gateway (NestJS, REST + GraphQL)
├── services/
│   ├── vehicle-service/         # Vehicle Service (Python, gRPC)
│   ├── customer-service/        # Customer Service (Python, gRPC)
│   └── rental-service/          # Rental Service (Python, gRPC)
├── proto/                       # Contratos gRPC (.proto) de los 3 dominios
├── frontend/                    # React + Vite
├── docker-compose.yml
└── README.md
```

## Organización del equipo

### Hito 1 (completo)

Cada funcionalidad se desarrolló en su propia rama feature a partir de `desarrollo`:

- Gestión de vehículos (ABM) → REST
- Gestión de clientes (ABM) → REST
- Alta y cancelación de reservas → REST
- Consulta de disponibilidad de vehículos (con filtros) → GraphQL
- Consulta de reservas (con filtros) → GraphQL
- Historial de alquileres → GraphQL

### Hito 2 — RPC

Arquitectura pedida: Interfaz web → **API Gateway** (REST/GraphQL) → **gRPC** → 3
microservicios de dominio (Vehículos, Clientes, Reservas), cada uno en un
lenguaje distinto al del Gateway, con contratos `.proto` documentados.

Estado por punto de la consigna:

| Punto | Estado | Detalle |
|---|---|---|
| 1. API Gateway | ✅ Implementado | Es el punto de entrada REST/GraphQL. El ABM de clientes y vehículos, las reservas, las consultas y el historial se atienden a través del Gateway; sus operaciones de dominio llaman los servicios internos por gRPC. |
| 2. Vehicle Service (gRPC) | ✅ Implementado | `services/vehicle-service/` implementa el ABM, la consulta de vehículos y disponibilidad, y la actualización de estado en Python. |
| 3. Customer Service (gRPC) | ✅ Implementado | `services/customer-service/` implementa el ABM, las consultas y las verificaciones de existencia y estado activo en Python. |
| 4. Rental Service (gRPC) | ✅ Implementado | `services/rental-service/` implementa creación, consulta, cancelación de reservas e historial en Python. |
| Contratos gRPC | ✅ Implementados | Los contratos de los tres dominios están en `proto/vehiculos.proto`, `proto/clientes.proto` y `proto/reservas.proto`. |
| Coordinación entre servicios | ✅ Implementada | Para crear una reserva, el Gateway verifica por gRPC que el cliente esté activo y consulta por gRPC el vehículo y su disponibilidad; después solicita la creación al Rental Service. |

**Alcance y arquitectura actual:** el Gateway mantiene acceso a PostgreSQL para autenticación y creación inicial del administrador. Además, los servicios Python usan la base de datos PostgreSQL compartida por Compose; por ejemplo, Rental Service consulta datos de clientes y vehículos al validar una reserva. Por lo tanto, las operaciones de dominio del Gateway pasan por gRPC, pero los servicios no tienen bases de datos aisladas entre sí.
