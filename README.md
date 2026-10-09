# Rentar - Sistema Distribuido

Sistema de alquiler de vehículos. Trabajo práctico de la materia **Desarrollo de Software en Sistemas Distribuidos** (UNLa).

## Stack

- **API Gateway:** NestJS + TypeScript + TypeORM + PostgreSQL + GraphQL (Apollo) — `backend/`
- **Vehicle Service:** Python + grpcio + SQLAlchemy — `services/vehicle-service/`
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

   Esto levanta 5 servicios: la base de datos PostgreSQL, Adminer, el Vehicle Service (Python/gRPC), el API Gateway (NestJS) y el frontend React. La primera vez tarda un par de minutos (instala dependencias dentro de los contenedores); las siguientes veces es mucho más rápido.

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
│   └── vehicle-service/         # Vehicle Service (Python, gRPC)
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

### Hito 2 — RPC (en progreso)

Arquitectura pedida: Interfaz web → **API Gateway** (REST/GraphQL) → **gRPC** → 3
microservicios de dominio (Vehículos, Clientes, Reservas), cada uno en un
lenguaje distinto al del Gateway, con contratos `.proto` documentados.

Estado por punto de la consigna:

| Punto | Estado | Detalle |
|---|---|---|
| 1. API Gateway | 🟡 Parcial | Ver desglose abajo |
| 2. Vehicle Service (gRPC) | ✅ Completo | `services/vehicle-service/` — las 6 operaciones del contrato implementadas en Python (listar, obtener, consultar disponibilidad, actualizar estado, crear, actualizar/dar de baja). Ver nota en el código sobre la tensión entre `ActualizarEstado` (persiste) y el derive-on-read de `ListarVehiculos`/`ObtenerVehiculo` |
| 3. Customer Service (gRPC) | ❌ Pendiente | Solo existe `proto/clientes.proto` (contrato). **Falta implementar el servicio completo** — queda para el equipo |
| 4. Rental Service (gRPC) | ❌ Pendiente | Solo existe `proto/reservas.proto` (contrato). **Falta implementar el servicio completo** — queda para el equipo |

**Desglose del punto 1 (API Gateway)** — importante separar qué falta por diseño incompleto nuestro vs. qué falta porque depende de otro servicio:

- ✅ Punto de entrada único, recibe REST/GraphQL, se comunica por gRPC con Vehicle Service, arma la respuesta para la interfaz web (incluye el cálculo de `importeTotal` en disponibilidad, que es aritmética sobre datos ya devueltos por el servicio, no una regla de dominio).
- ✅ **Todo el dominio Vehículos pasa por gRPC**: `GET/POST/PATCH/DELETE /vehiculos` y la disponibilidad ya no tienen ningún provider en el Gateway con `@InjectRepository(Vehiculo)` — se eliminó `VehiculosService` por completo. La única razón por la que `vehiculos.module.ts` todavía registra la entidad `Vehiculo` en TypeORM es que `Reserva` (dominio de Reservas, sin migrar) tiene una relación `@ManyToOne` hacia ella y TypeORM necesita conocerla para resolver esa relación — está comentado en el código.
- ❌ **Clientes, Reservas, Disponibilidad-por-GraphQL del lado de reservas e Historial** siguen 100% locales en el Gateway (TypeORM directo), porque Customer Service y Rental Service todavía no existen. Esto depende de que el equipo construya esos servicios.
- ❌ **"Coordinar operaciones que requieran la participación de más de un servicio"** no está demostrado todavía (el caso de ejemplo de la consigna es crear una reserva coordinando Customer + Vehicle + Rental Service). No se puede implementar hasta que exista al menos un segundo servicio además de Vehicle Service.

En criollo: lo que dependía solo de nosotros (migrar el ABM completo de vehículos) ya está cerrado. Lo que queda del punto 1 depende 100% de que el equipo construya Customer y/o Rental Service (puntos 3 y 4) para poder migrar esos dominios y mostrar coordinación multi-servicio.
