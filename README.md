# Rentar - Sistema Distribuido

Sistema de alquiler de vehículos. Trabajo práctico de la materia **Desarrollo de Software en Sistemas Distribuidos** (UNLa).

## Stack

- **API Gateway:** NestJS + TypeScript + GraphQL (Apollo) — `backend/`
- **Vehicle Service:** Python + grpcio + SQLAlchemy — `services/vehicle-service/`
- **Customer Service:** Python + grpcio + SQLAlchemy — `services/customer-service/`
- **Rental Service:** Python + grpcio + SQLAlchemy — `services/rental-service/`
- **Registros Service:** Python + pika + SQLAlchemy — `services/registros-service/` (registros externos simulados, solo eventos)
- **Comunicación Gateway ↔ servicios internos:** gRPC (contratos en `proto/`)
- **Comunicación asíncrona entre servicios:** RabbitMQ (contratos en `eventos/`)
- **Frontend:** React + Vite
- **Infraestructura:** Docker Compose

## Arquitectura

```text
Frontend
   | REST / GraphQL
   v
API Gateway
   |-- gRPC --> Customer Service --> Customer DB
   |-- gRPC --> Vehicle Service  --> Vehicle DB
   `-- gRPC --> Rental Service   --> Rental DB
```

El Gateway no accede a PostgreSQL. Cada servicio es dueño de su base y las
referencias entre dominios se validan mediante gRPC.

Desde el Hito 3 los servicios también se comunican por eventos a través de
RabbitMQ, para los procesos que no necesitan una respuesta inmediata
(verificación de patentes, incorporación de vehículos externos y mantenimiento
preventivo). Los eventos, las colas y la forma de usarlos están documentados en
[`eventos/README.md`](eventos/README.md). La consola de RabbitMQ queda en
http://localhost:15672 (usuario `rentar`, contraseña `rentar`).

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

   Esto levanta cuatro bases PostgreSQL independientes, RabbitMQ, Adminer, los tres servicios gRPC (Python), Registros Service, el API Gateway (NestJS) y el frontend React. La primera vez tarda un par de minutos (instala dependencias dentro de los contenedores); las siguientes veces es mucho más rápido.

   > **Si ya tenías el proyecto levantado de antes del Hito 3**, cambió el
   > esquema de `vehicle_db` y hay bases nuevas. Regenerá todo una vez con
   > `docker compose down -v` y después `docker compose up --build`.

4. Cuando termine de levantar, vas a tener disponible:

   | Servicio  | URL                          | Notas                          |
   |-----------|------------------------------|---------------------------------|
   | Frontend  | http://localhost:5173        |                                  |
   | Backend   | http://localhost:3000        | API REST + GraphQL              |
   | Swagger   | http://localhost:3000/api/docs | Documentación y pruebas REST |
   | GraphQL   | http://localhost:3000/graphql | Consultas GraphQL              |
   | Adminer   | http://localhost:8080        | Ver tabla de abajo para entrar  |
   | RabbitMQ  | http://localhost:15672       | Consola del broker. Usuario `rentar`, contraseña `rentar` |
   | Customer DB | localhost:5432             | PostgreSQL exclusivo de Customer Service |
   | Vehicle DB  | localhost:5433             | PostgreSQL exclusivo de Vehicle Service |
   | Rental DB   | localhost:5434             | PostgreSQL exclusivo de Rental Service |
   | Registros DB | localhost:5435            | PostgreSQL exclusivo de Registros Service |

   Para entrar a **Adminer**, elegí la base que quieras inspeccionar:

   | Dominio | Servidor | Usuario | Contraseña | Base |
   |---|---|---|---|---|
   | Clientes | `customer_db` | `customer` | `customer` | `customer_db` |
   | Vehículos | `vehicle_db` | `vehicle` | `vehicle` | `vehicle_db` |
   | Reservas | `rental_db` | `rental` | `rental` | `rental_db` |
   | Registros externos | `registros_db` | `registros` | `registros` | `registros_db` |


   ### Acceso inicial

   En el primer inicio, el API Gateway solicita por gRPC a Customer Service la
   creación idempotente de un administrador.

   | Campo | Valor |
   |---|---|
   | Email | `admin@rentar.com` |
   | Contraseña | Valor configurado en `ADMIN_PASSWORD` dentro de `backend/.env` |

   También se cargan datos demostrativos al crear los volúmenes por primera vez:

   | Perfil | Email | Contraseña |
   |---|---|---|
   | Cliente demo | `mfernandez@gmail.com` | `ClienteRentar2026!` |

   El cliente demo tiene tres vehículos precargados para consultar, una
   reserva futura y un alquiler pasado visible en el historial. Los seeds se
   ejecutan solamente al crear los volúmenes; `docker compose down` conserva
   los datos y `docker compose down -v` permite regenerarlos desde cero.

   ### Probar la verificación de vehículos

   El registro policial simulado (`registros_db.patentes_robadas`) se carga
   solo con el seed, no hace falta cargar nada a mano. Estas patentes están
   denunciadas como robadas:

   | Patentes denunciadas |
   |---|
   | `AD123RB`, `AE456RB`, `AF789RB`, `RBO123` |

   Al crear un vehículo desde **Gestión de Vehículos**, la columna
   *Verificación* arranca en *Pendiente* y a los pocos segundos pasa a
   *Robado* si la patente está en esa lista, o a *Validado* si no. Un
   vehículo robado no aparece en la consulta de disponibilidad y no se puede
   reservar.

   Para denunciar otra patente, entrá a Adminer con la base de registros
   externos y ejecutá (la patente va en mayúsculas, sin espacios ni guiones):

   ```sql
   INSERT INTO patentes_robadas (patente, "fechaDenuncia", descripcion)
   VALUES ('AB999CD', '2026-10-20', 'Denuncia de prueba');
   ```

   Para ver los eventos en la consola de RabbitMQ, el flujo completo y cómo
   publicar eventos de prueba, ver [`eventos/README.md`](eventos/README.md).

5. Para bajar todo: `Ctrl+C` en la terminal donde quedó corriendo, y después:

   ```bash
   docker compose down
   ```

   Si además querés borrar todos los datos actuales y regenerar los esquemas y
   seeds desde cero, usá `docker compose down -v`. Esta operación elimina
   todos los volúmenes (las bases y RabbitMQ) y no se puede deshacer.

## Hot reload

Tanto el backend como el frontend corren montados como volúmenes dentro de sus contenedores, así que los cambios que hagas en el código se reflejan automáticamente sin necesidad de reconstruir las imágenes.

Los servicios Python también tienen su código montado, pero no usan hot reload:
después de modificar un `server.py` hay que reiniciar el servicio. Si cambia un
`requirements.txt`, hay que reconstruir su imagen.

## Estructura del repo

```
.
├── backend/                     # API Gateway (NestJS, REST + GraphQL)
├── services/
│   ├── vehicle-service/         # Vehicle Service (Python, gRPC)
│   ├── customer-service/        # Customer Service (Python, gRPC)
│   ├── rental-service/          # Rental Service (Python, gRPC)
│   └── registros-service/       # Registros externos simulados (Python, solo eventos)
├── proto/                       # Contratos gRPC (.proto) de los 3 dominios
├── eventos/                     # Contratos de eventos y cliente RabbitMQ compartido
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
| 2. Vehicle Service (gRPC) | ✅ Implementado | `services/vehicle-service/` implementa el ABM, las consultas y los filtros propios de vehículos. Rental Service informa la ocupación temporal y el Gateway compone la disponibilidad. |
| 3. Customer Service (gRPC) | ✅ Implementado | `services/customer-service/` implementa el ABM, las consultas y las verificaciones de existencia y estado activo en Python. |
| 4. Rental Service (gRPC) | ✅ Implementado | `services/rental-service/` implementa creación, consulta, cancelación de reservas e historial en Python. |
| Contratos gRPC | ✅ Implementados | Los contratos de los tres dominios están en `proto/vehiculos.proto`, `proto/clientes.proto` y `proto/reservas.proto`. |
| Coordinación entre servicios | ✅ Implementada | Rental Service valida cliente y vehículo mediante gRPC antes de crear una reserva. El Gateway combina los filtros de Vehicle Service con la ocupación informada por Rental Service. |

**Arquitectura actual:** el Gateway no accede a ninguna base de datos. Cada servicio Python posee una base PostgreSQL y credenciales independientes; las referencias entre dominios se guardan como identificadores y se validan mediante gRPC. Rental DB impide atómicamente reservas superpuestas con una restricción `EXCLUDE` de PostgreSQL.
