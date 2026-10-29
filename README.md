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

   ### Probar el alta de vehículos de propietarios externos (Hito 3 - P3)

   Para probar el alta y el circuito asíncrono de un vehículo externo:

   1. Ingresá al Frontend (http://localhost:5173/login) con el cliente demo (`mfernandez@gmail.com` / `ClienteRentar2026!`).
   2. Hacé clic en **"Ofrecer mi Vehículo"** (en el Home o en la barra superior).
   3. Completá el formulario (ej. Patente `AD777EX`, Toyota Corolla 2023, Sedán, $32.000) y hacé clic en **"Publicar Vehículo"**.
   4. El sistema confirmará el registro en estado **"Pendiente de validación"** y publicará en RabbitMQ el evento `vehiculos.externos.registrados`.
   5. Para simular la resolución exitosa de las validaciones policiales y de titularidad (emitidas por el correlador de P4), ejecutá:

      ```bash
      docker compose exec vehicle_service python -c "from eventos import broker; broker.publicar('vehiculos.externos.validacion.completada', {'vehiculoExternoId': 1})"
      ```

   6. Vehicle Service consumirá el evento, marcará la solicitud como `APROBADO` e ingresará el auto en la tabla `vehiculos` con estado `DISPONIBLE` y `verificacion = VALIDADO`.
   7. Al entrar a **Consultar Disponibilidad** en el Frontend, el auto ya aparecerá listado y disponible para reservar.

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

### Hito 3 — Procesamiento Asíncrono (RabbitMQ)

#### Hito 3 - P3: Alta de Vehículos de Propietarios Externos

Permite a los clientes registrados en la plataforma dar de alta sus propios vehículos para que sean incorporados al catálogo de alquiler de Rentar tras ser validados policial y legalmente de manera asíncrona.

##### 1. Resumen de la Arquitectura y Componentes Desarrollados

- **Frontend (React + Vite):**
  - **Nueva vista [`PublicarVehiculo.jsx`](frontend/src/pages/PublicarVehiculo.jsx):** Ruta `/cliente/publicar-vehiculo` protegida para el rol `CLIENTE`.
  - **Acceso integrado:** Nueva tarjeta destacada en el dashboard del cliente ([`HomeClientes.jsx`](frontend/src/pages/HomeClientes.jsx)) y botón de navegación en la barra superior ([`NavBarCliente.jsx`](frontend/src/components/NavBarCliente.jsx)).
  - **Formulario de carga:** Permite ingresar Patente, Tipo de vehículo (`SEDAN`, `SUV`, `PICKUP`, `COUPE`, `HATCHBACK`), Marca, Modelo, Año, Color y Precio Diario.
  - **Gestión de estados:** Bloqueo de controles y estado de carga (`loading`) durante la solicitud; alertas claras de confirmación indicando el estado **"Pendiente de validación"** y carteles de error ante respuestas fallidas.
  - **Servicio:** Función `registrarVehiculoExterno(datos)` en [`vehiculos.service.js`](frontend/src/services/vehiculos.service.js) que se comunica con el Gateway enviando el JWT correspondiente.

- **API Gateway (NestJS):**
  - **Controlador [`VehiculosExternosController`](backend/src/vehiculos/vehiculos-externos.controller.ts):** Expone el endpoint `POST /vehiculos/externos`.
  - **Seguridad perimetral:** Protegido con `@UseGuards(JwtAuthGuard, RolesGuard)` y rol exigido `@Roles(RolUsuario.CLIENTE)`.
  - **Inyección segura de identidad:** El ID del cliente no se toma del body del request para prevenir suplantación de identidad (spoofing); se inyecta de forma garantizada desde el payload del JWT firmado mediante `@CurrentUser() user: AuthenticatedUser`.
  - **Validación DTO:** Implementada en [`CreateVehiculoExternoDto`](backend/src/vehiculos/dto/create-vehiculo-externo.dto.ts) y tipada en [`VehiculoExternoResponseDto`](backend/src/vehiculos/dto/vehiculo-externo-response.dto.ts) con decoradores de `class-validator` y `class-transformer`.
  - **Cliente gRPC:** Tipado en [`vehiculo-grpc.interface.ts`](backend/src/vehiculos/grpc/vehiculo-grpc.interface.ts) y consumido vía `lastValueFrom()`, mapeando el estado de gRPC `ALREADY_EXISTS` a una excepción HTTP 409 Conflict.

- **Vehicle Service (Python + gRPC + SQLAlchemy):**
  - **Tabla `vehiculos_externos` en `vehicle_db`:** Modelo persistente que almacena la solicitud con campos `id`, `clienteId`, `patente`, `marca`, `modelo`, `anio`, `color`, `tipoVehiculo`, `precioDiario`, `estado` (iniciado en `'PENDIENTE'`), `creadoEn` y `actualizadoEn`.
  - **Método gRPC `RegistrarVehiculoExterno`:** Valida que la patente no esté dada de alta en `vehiculos` ni exista ya una solicitud en trámite (`'PENDIENTE'` o `'APROBADO'`) en `vehiculos_externos`. Inserta el registro y, tras el commit, dispara el evento hacia RabbitMQ.
  - **Publicación asíncrona:** Publica en RabbitMQ (`rentar.eventos`) el evento `vehiculos.externos.registrados`.
  - **Consumidor asíncrono (`vehiculos.externos-completada`):** Consume en segundo plano el evento `vehiculos.externos.validacion.completada` emitido por el correlador de P4. Al recibirlo, promueve atómicamente la solicitud a estado `'APROBADO'` e inserta el vehículo en la tabla `vehiculos` con `estado = 'DISPONIBLE'`, `verificacion = 'VALIDADO'` y `activo = true` (utilizando `ON CONFLICT (patente) DO NOTHING` para garantizar idempotencia ante reentregas de mensajes).

##### 2. Contratos de Eventos RabbitMQ Asociados

* **Evento Producido por P3 (Consumido por P4 / Registros Service):**
  * **Nombre / Routing Key:** `vehiculos.externos.registrados`
  * **Destinos (Colas):** `registros.externos-patente` y `registros.externos-titularidad`.
  * **Payload:**
    ```json
    {
      "vehiculoExternoId": 1,
      "clienteId": 2,
      "patente": "AD777EX"
    }
    ```

* **Evento Consumido por P3 (Producido por el Correlador de P4):**
  * **Nombre / Routing Key:** `vehiculos.externos.validacion.completada`
  * **Cola:** `vehiculos.externos-completada`
  * **Payload desde la terminal:** docker compose exec vehicle_service python -c "from eventos import broker; broker.publicar('vehiculos.externos.validacion.completada', {'vehiculoExternoId': 1})"
    

##### 3. Guía de Pruebas y Comandos de Verificación

1. **Alta desde el Frontend:**
   - Iniciar sesión en http://localhost:5173/login con el usuario cliente demo (`mfernandez@gmail.com` / `ClienteRentar2026!`).
   - Ir a **"Ofrecer mi Vehículo"** (`/cliente/publicar-vehiculo`), completar los campos y publicar.
   - Verificar la alerta verde confirmando el registro en estado **"Pendiente de validación"**.

2. **Simular Aprobación desde la Terminal (Evento del correlador de P4):**
   - Publicar el evento de validación completada utilizando el cliente broker de Python:
     ```bash
     docker compose exec vehicle_service python -c "from eventos import broker; broker.publicar('vehiculos.externos.validacion.completada', {'vehiculoExternoId': 1})"
     ```

3. **Verificación en la Base de Datos (`vehicle_db`):**
   - Ejecutar consultas vía `psql` directo en el contenedor para corroborar ambas tablas con el usuario `vehicle`:
     ```bash
     # 1. Verificar que la solicitud en vehiculos_externos pasó a estado APROBADO:
     docker compose exec vehicle_db psql -U vehicle -d vehicle_db -c "SELECT id, \"clienteId\", patente, marca, modelo, estado, \"actualizadoEn\" FROM vehiculos_externos WHERE id = 1;"

     # 2. Verificar que el vehículo fue insertado en vehiculos con estado DISPONIBLE y verificacion VALIDADO:
     docker compose exec vehicle_db psql -U vehicle -d vehicle_db -c "SELECT id, patente, marca, modelo, \"tipoVehiculo\", \"precioDiario\", estado, verificacion, activo FROM vehiculos WHERE patente = 'AD777EX';"
     ```
   - O bien corroborar desde Adminer en http://localhost:8080 (Servidor: `vehicle_db`, Usuario: `vehicle`, Contraseña: `vehicle`, Base: `vehicle_db`).

##### 4. Nota de Diseño / Consideración Técnica

- **Integración transparente en el catálogo:** Una vez que la validación se completa y el vehículo es promovido a la tabla `vehiculos` con estado `DISPONIBLE`, se acopla inmediatamente al flujo general de Rentar: es retornado por el API Gateway en las consultas de disponibilidad y queda listo para ser reservado por cualquier usuario.
- **Mejora futura:** Actualmente el modelo operativo permite que cualquier cliente reserve el vehículo una vez disponible. Se plantea como mejora futura incorporar una regla de negocio en el Gateway o Rental Service para restringir que el mismo cliente titular que dio de alta el vehículo externo pueda reservarlo.
