# Rentar - Sistema Distribuido

**Rentar** es un sistema de alquiler de vehículos. Es el trabajo práctico de la
materia **Desarrollo de Software en Sistemas Distribuidos** de la Universidad
Nacional de Lanús (UNLa).

Desde la página web:

- **el administrador** gestiona los vehículos, los clientes y las reservas;
- **los clientes** buscan autos disponibles, reservan, cancelan, ven su
  historial y pueden ofrecer su propio auto para que Rentar lo alquile.

## Un proyecto construido por entregas

El sistema no se hizo de una sola vez: se construyó en **tres entregas
incrementales**, llamadas *hitos*. Cada hito parte de lo que ya funcionaba y le
suma algo nuevo, sin perder lo anterior. Cada entrega quedó marcada con un
**tag** (una etiqueta) en la rama `main`, que guarda el proyecto exactamente
como se entregó.

| Entrega | Tag | Fecha | La idea en una frase |
|---|---|---|---|
| **Hito 3** | [`hito-3`](https://github.com/rober-7/rentar-sistema-distribuido/tree/hito-3) | 30/10/2026 | Algunas tareas pasan a resolverse **en segundo plano**, sin hacer esperar al usuario. |
| **Hito 2** | [`hito-2`](https://github.com/rober-7/rentar-sistema-distribuido/tree/hito-2) | 12/10/2026 | El sistema se divide en **servicios especializados**, cada uno con sus propios datos. |
| **Hito 1** | [`hito-1`](https://github.com/rober-7/rentar-sistema-distribuido/tree/hito-1) | 21/09/2026 | La **primera versión** funcionando, con todas las operaciones básicas. |

Para ver una entrega tal como se presentó: en GitHub, abrí el selector de ramas,
elegí la pestaña **Tags** y después el hito. Desde la terminal:
`git checkout hito-1` (o `hito-2`, `hito-3`).

---

### Hito 3: tareas en segundo plano

**El problema:** hay tareas que llevan tiempo y que el usuario no necesita ver
terminadas en el momento. Hacerlo esperar hasta que terminen no tiene sentido.

**La solución:** es como dejar un pedido en un mostrador y que te avisen cuando
está listo. El sistema anota la tarea, responde enseguida y la tarea se resuelve
por detrás. Para eso se sumó un **sistema de mensajería** (RabbitMQ) que
funciona como un correo interno: un servicio deja un mensaje y otro lo levanta
cuando puede, sin que ninguno tenga que esperar al otro.

Con esa base se agregaron tres procesos:

1. **Control de autos robados.** Cuando el administrador da de alta un
   vehículo, el sistema consulta en segundo plano un registro policial
   simulado. Si la patente tiene una denuncia de robo, el auto queda marcado y
   nadie lo puede reservar.
2. **Autos de particulares.** Un cliente puede ofrecer su propio auto para que
   Rentar lo alquile. Antes de aceptarlo se hacen dos controles al mismo
   tiempo: que la patente no esté denunciada y que el cliente sea realmente el
   dueño, según un registro automotor simulado. Si los dos controles dan bien,
   el auto se suma a la flota; si alguno falla, se rechaza. El cliente puede
   seguir el resultado en vivo desde la pantalla **"Mis Vehículos Ofrecidos"**.
3. **Mantenimiento preventivo.** Cada vez que se confirma una reserva, se pide
   un mantenimiento del auto. La reserva se confirma al instante y el
   resultado del mantenimiento queda registrado unos segundos después.

<details>
<summary><strong>Detalle técnico del Hito 3</strong></summary>

- **Broker:** RabbitMQ 3.13, con un exchange `topic` y una cola por consumidor.
  Los eventos, las colas, el formato de cada mensaje y las reglas para
  consumidores están en [`eventos/README.md`](eventos/README.md).
- **Servicios nuevos:** Registros Service (registros policial y automotor
  simulados) y Mantenimiento Service, cada uno con su propia base.
- **Combinación síncrona y asíncrona:** lo que necesita una respuesta inmediata
  sigue por gRPC. Lo que puede esperar viaja como evento. El Gateway no se
  conecta al broker: consulta por gRPC el estado que van dejando los eventos.

**Incorporación de vehículos externos, componente por componente:**

- **Frontend:** formulario [`PublicarVehiculo.jsx`](frontend/src/pages/PublicarVehiculo.jsx)
  (`/cliente/publicar-vehiculo`) y vista
  [`MisVehiculosOfrecidos.jsx`](frontend/src/pages/MisVehiculosOfrecidos.jsx)
  (`/cliente/mis-vehiculos`). Esta muestra el resultado de cada validación y
  se vuelve a consultar cada 2 segundos mientras haya solicitudes pendientes.
  Los dos accesos están en la tarjeta "Ofrecer mi Vehículo" del Home del
  cliente.
- **API Gateway:** [`VehiculosExternosController`](backend/src/vehiculos/vehiculos-externos.controller.ts)
  expone `POST /vehiculos/externos` (alta) y `GET /vehiculos/externos`
  (solicitudes del cliente). Exige rol `CLIENTE`, y el `clienteId` sale del
  JWT, nunca del body, así nadie puede actuar en nombre de otro.
- **Vehicle Service:**
  - `RegistrarVehiculoExterno` guarda la solicitud `PENDIENTE` en
    `vehiculos_externos`, con control de duplicados, y publica
    `vehiculos.externos.registrados`.
  - **Correlador** (cola `vehiculos.externos-validaciones`): junta los dos
    resultados por `vehiculoExternoId`, que pueden llegar en cualquier orden.
    Los guarda en `validacionPatente` y `validacionTitularidad`. Un `RECHAZADO`
    rechaza la solicitud; dos `VALIDADO` publican
    `vehiculos.externos.validacion.completada`. Usa `SELECT ... FOR UPDATE`
    para que dos resultados simultáneos no se pisen.
  - El consumidor de `completada` incorpora el vehículo como `DISPONIBLE`,
    pero solo si las dos validaciones están aprobadas.
  - Al arrancar, retoma las solicitudes `PENDIENTE` cuyo evento pudo perderse.
- **Registros Service:** consume `vehiculos.externos.registrados` desde dos
  colas independientes. Valida la patente contra `patentes_robadas`, y la
  titularidad contra `titularidades`, pidiendo el documento del cliente a
  Customer Service por gRPC.

**Mejora futura:** hoy cualquier cliente puede reservar un vehículo externo
incorporado, incluso su propio dueño. Se podría agregar una regla que lo
impida.

</details>

---

### Hito 2: servicios especializados

**El problema:** en el Hito 1 todo vivía en un solo programa con una sola base
de datos. Funciona, pero si una parte falla o hay que cambiarla, se toca todo.

**La solución:** es como una empresa que se organiza por áreas. El sistema se
dividió en tres **servicios especializados**: uno para clientes, uno para
vehículos y uno para reservas. Cada uno guarda **sus propios datos** y nadie
toca los datos de otro: si un área necesita algo de otra, se lo pide. Por
delante quedó el **API Gateway**, que funciona como la mesa de entrada: recibe
todo lo que llega desde la página web y lo deriva al área que corresponde.

Para el usuario la página sigue haciendo lo mismo. El cambio está adentro. En
esta entrega también se sumó el **inicio de sesión** con usuario y contraseña,
con permisos distintos para el administrador y para los clientes.

<details>
<summary><strong>Detalle técnico del Hito 2</strong></summary>

Arquitectura pedida: interfaz web → **API Gateway** (REST/GraphQL) → **gRPC** →
3 microservicios de dominio, en un lenguaje distinto al del Gateway (Python), y
con contratos `.proto` documentados.

| Punto de la consigna | Cómo se resolvió |
|---|---|
| 1. API Gateway | Punto de entrada REST/GraphQL en NestJS. No accede a ninguna base: todas las operaciones de dominio llaman a los servicios internos por gRPC. |
| 2. Vehicle Service | `services/vehicle-service/`: ABM, consultas y filtros de vehículos. |
| 3. Customer Service | `services/customer-service/`: ABM de clientes, verificaciones de existencia y estado, y validación de login (la contraseña nunca sale del servicio). |
| 4. Rental Service | `services/rental-service/`: creación, consulta y cancelación de reservas, e historial. |
| Contratos | `proto/vehiculos.proto`, `proto/clientes.proto` y `proto/reservas.proto`, con fechas en ISO 8601. |
| Coordinación | Rental Service valida cliente y vehículo por gRPC antes de reservar. El Gateway combina los filtros de Vehicle Service con la ocupación que informa Rental Service. |

Cada servicio tiene su propia base PostgreSQL con credenciales independientes.
Entre dominios solo se guardan identificadores, que se validan por gRPC. La
base de reservas impide reservas superpuestas con una restricción `EXCLUDE` de
PostgreSQL.

</details>

---

### Hito 1: la primera versión

La primera entrega puso a funcionar el sistema completo como **una sola
aplicación** con **una sola base de datos**, más la página web:

- **Administrador:** alta, baja y modificación de vehículos y de clientes, y
  gestión de las reservas.
- **Cliente:** consulta de autos disponibles con filtros (tipo, marca, precio,
  fechas), alta y cancelación de reservas, consulta de sus reservas e
  historial de alquileres.

<details>
<summary><strong>Detalle técnico del Hito 1</strong></summary>

Backend en NestJS + TypeORM sobre PostgreSQL y frontend en React + Vite, todo
con Docker Compose. Cada funcionalidad se desarrolló en su propia rama a partir
de `desarrollo`:

| Funcionalidad | Tipo de API |
|---|---|
| ABM de vehículos | REST |
| ABM de clientes | REST |
| Alta y cancelación de reservas | REST |
| Consulta de disponibilidad (con filtros) | GraphQL |
| Consulta de reservas (con filtros) | GraphQL |
| Historial de alquileres | GraphQL |

REST se usa para las operaciones que modifican datos, y GraphQL para las
consultas, donde el frontend elige qué campos necesita.

</details>

---

## Cómo está armado hoy

```text
                     Navegador (frontend React)
                                │  REST / GraphQL
                                ▼
                           API Gateway
               ┌────────────────┼────────────────┐   gRPC: pide y espera la respuesta
               ▼                ▼                ▼
       Customer Service   Vehicle Service   Rental Service
          customer_db       vehicle_db        rental_db
                                │                │
                                └─── RabbitMQ ───┘   eventos: avisa y sigue
                                    │        │
                       Registros Service   Mantenimiento Service
                         registros_db       mantenimiento_db
```

- Cada servicio es dueño de su base de datos; el Gateway no accede a ninguna.
- **gRPC** se usa cuando hace falta una respuesta en el momento, por ejemplo
  para validar un cliente antes de reservar.
- **RabbitMQ** se usa para lo que puede resolverse en segundo plano. La consola
  queda en http://localhost:15672 (usuario `rentar`, contraseña `rentar`).
- Registros Service también le pide datos a Customer Service por gRPC, para
  validar la titularidad.

### Tecnologías

| Pieza | Tecnología | Carpeta |
|---|---|---|
| Frontend | React + Vite | `frontend/` |
| API Gateway | NestJS + TypeScript, REST y GraphQL (Apollo) | `backend/` |
| Customer, Vehicle y Rental Service | Python + gRPC + SQLAlchemy | `services/` |
| Registros y Mantenimiento Service | Python + RabbitMQ (pika) + SQLAlchemy | `services/` |
| Contratos gRPC | Protocol Buffers | `proto/` |
| Contratos de eventos | Python | `eventos/` |
| Bases de datos | PostgreSQL 16, una por servicio | |
| Infraestructura | Docker Compose | `docker-compose.yml` |

## Cómo levantar el proyecto

### Requisitos previos

- Tener instalado **Docker Desktop** y dejarlo **corriendo** (el ícono de la
  ballena tiene que estar activo). No hace falta instalar Node, PostgreSQL ni
  nada más en tu máquina.

### Paso a paso

1. Cloná el repositorio (o hacé `git pull` si ya lo tenías clonado) y parate en
   la rama `desarrollo`:

   ```bash
   git clone <url-del-repo>
   cd rentar-sistema-distribuido
   git checkout desarrollo
   git pull
   ```

2. Copiá el archivo de variables de entorno de ejemplo (no hace falta editar
   nada adentro):

   ```bash
   cp backend/.env.example backend/.env
   ```

3. Levantá todo con un solo comando:

   ```bash
   docker compose up --build
   ```

   Esto levanta cinco bases PostgreSQL independientes, RabbitMQ, Adminer, los
   cinco servicios Python, el API Gateway y el frontend. La primera vez tarda
   un par de minutos (instala dependencias dentro de los contenedores); las
   siguientes veces es mucho más rápido.

   > **Si ya tenías el proyecto levantado de antes del Hito 3**, no hace falta
   > borrar nada: los servicios agregan solos las tablas y columnas nuevas al
   > arrancar. Si igual querés empezar de cero, usá `docker compose down -v` y
   > después `docker compose up --build` (esto borra todos los datos).

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
   | Mantenimiento DB | localhost:5436       | PostgreSQL exclusivo de Mantenimiento Service |

   Para entrar a **Adminer**, elegí la base que quieras inspeccionar:

   | Dominio | Servidor | Usuario | Contraseña | Base |
   |---|---|---|---|---|
   | Clientes | `customer_db` | `customer` | `customer` | `customer_db` |
   | Vehículos | `vehicle_db` | `vehicle` | `vehicle` | `vehicle_db` |
   | Reservas | `rental_db` | `rental` | `rental` | `rental_db` |
   | Registros externos | `registros_db` | `registros` | `registros` | `registros_db` |
   | Mantenimiento | `mantenimiento_db` | `mantenimiento` | `mantenimiento` | `mantenimiento_db` |

5. Para bajar todo: `Ctrl+C` en la terminal donde quedó corriendo, y después:

   ```bash
   docker compose down
   ```

   Si además querés borrar todos los datos actuales y regenerar los esquemas y
   seeds desde cero, usá `docker compose down -v`. Esta operación elimina
   todos los volúmenes (las bases y RabbitMQ) y no se puede deshacer.

### Usuarios para entrar

| Perfil | Email | Contraseña |
|---|---|---|
| Administrador | `admin@rentar.com` | La que figura en `ADMIN_PASSWORD` dentro de `backend/.env` |
| Cliente demo | `mfernandez@gmail.com` | `ClienteRentar2026!` |

El administrador se crea solo en el primer inicio. El cliente demo (Martín
Fernández, documento `32619541`) viene con tres vehículos precargados, una
reserva futura y un alquiler pasado en el historial. Los datos de ejemplo se
cargan solamente al crear las bases: `docker compose down` los conserva y
`docker compose down -v` permite regenerarlos.

## Cómo probar lo nuevo del Hito 3

Los eventos de cada prueba se pueden ver pasar en la consola de RabbitMQ
(http://localhost:15672). El flujo completo y cómo publicar eventos de prueba a
mano están en [`eventos/README.md`](eventos/README.md).

### Control de autos robados

El registro policial simulado ya viene cargado con estas patentes denunciadas:

| Patentes denunciadas |
|---|
| `AD123RB`, `AE456RB`, `AF789RB`, `RBO123` |

1. Entrá como administrador y, en **Gestión de Vehículos**, creá un vehículo.
2. La columna *Verificación* arranca en *Pendiente* y a los pocos segundos pasa
   a *Robado* si la patente está en la lista, o a *Validado* si no.
3. Un vehículo robado no aparece en la consulta de disponibilidad y, si se
   intenta reservar, el sistema lo rechaza.

Para denunciar otra patente, entrá a Adminer con la base de registros externos
y ejecutá (la patente va en mayúsculas, sin espacios ni guiones):

```sql
INSERT INTO patentes_robadas (patente, "fechaDenuncia", descripcion)
VALUES ('AB999CD', '2026-10-20', 'Denuncia de prueba');
```

### Autos de particulares

1. Entrá con el cliente demo.
2. En el Home, en la tarjeta **"Ofrecer mi Vehículo"**, hacé clic en
   **"Publicar Vehículo"**.
3. Completá el formulario con una de las patentes de la tabla de abajo y hacé
   clic en **"Publicar Vehículo"**. La solicitud queda **"Pendiente de
   validación"**.
4. Hacé clic en **"Seguir el resultado"**. En **"Mis Vehículos Ofrecidos"** se
   ve cómo se resuelve cada control en unos segundos, sin recargar la página.
5. Si los dos controles dan bien, el auto aparece en **Consultar
   Disponibilidad** y se puede reservar como cualquier otro.

El registro automotor simulado trae estas patentes para probar cada caso:

| Patente | ¿Denunciada? | ¿El cliente demo es el dueño? | Resultado |
|---|---|---|---|
| `AD777EX`, `AE888EX` | No | Sí | **Aprobado**: se suma a la flota |
| `AF789RB` | Sí | Sí | **Rechazado** |
| `AG555EX` | No | No, es de otra persona | **Rechazado** |
| cualquier otra | No | No figura en el registro | **Rechazado** |

Una patente rechazada se puede volver a enviar. Para ver el detalle en la base:

```bash
docker compose exec vehicle_db psql -U vehicle -d vehicle_db -c "SELECT id, patente, estado, \"validacionPatente\", \"validacionTitularidad\" FROM vehiculos_externos ORDER BY id;"
```

### Mantenimiento preventivo

1. Entrá con el cliente demo y hacé una reserva desde **Consultar
   Disponibilidad**. Se confirma al instante.
2. Unos segundos después, el resultado del mantenimiento queda guardado en la
   reserva. Para verlo:

   ```bash
   docker compose exec rental_db psql -U rental -d rental_db -c "SELECT id, vehiculo_id, estado, mantenimiento_resultado FROM reservas ORDER BY id DESC LIMIT 5;"
   ```

El resultado es `REALIZADO` por defecto. Para probar el caso `NO_REALIZADO`,
cambiá `RESULTADO_MANTENIMIENTO` en el servicio `mantenimiento_service` de
`docker-compose.yml` y aplicalo con `docker compose up -d mantenimiento_service`
(un `restart` no toma los cambios de variables).

## Para el equipo de desarrollo

### Hot reload

El backend y el frontend corren con su código montado dentro de los
contenedores, así que los cambios se ven al instante sin reconstruir nada.

Los servicios Python también tienen su código montado, pero no se recargan
solos: después de modificar un `server.py` hay que reiniciar ese servicio
(`docker compose restart <servicio>`). Si cambia un `requirements.txt`, hay que
reconstruir su imagen.

### Estructura del repo

```
.
├── backend/                     # API Gateway (NestJS, REST + GraphQL)
├── services/
│   ├── customer-service/        # Clientes (Python, gRPC)
│   ├── vehicle-service/         # Vehículos (Python, gRPC + eventos)
│   ├── rental-service/          # Reservas (Python, gRPC + eventos)
│   ├── registros-service/       # Registros policial y automotor simulados (Python, eventos)
│   └── mantenimiento-service/   # Mantenimiento preventivo (Python, eventos)
├── proto/                       # Contratos gRPC (.proto) de los 3 dominios
├── eventos/                     # Contratos de eventos y cliente RabbitMQ compartido
├── frontend/                    # React + Vite
├── docker-compose.yml
└── README.md
```

### Forma de trabajo

Cada funcionalidad se desarrolla en su propia rama a partir de `desarrollo` y
entra por pull request. Al cerrar cada hito, `desarrollo` se mergea a `main` y
se marca el tag de la entrega (`hito-1`, `hito-2`, `hito-3`).
