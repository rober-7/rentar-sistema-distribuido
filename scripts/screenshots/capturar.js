/**
 * Genera las capturas de pantalla para la documentación del Hito 2.
 *
 * No es parte de la app: es una herramienta de uso puntual, separada del
 * frontend, que recorre la interfaz real (contra Docker Compose levantado)
 * y guarda una captura en cada paso. Cada captura tiene un comentario al
 * lado indicando a qué sección del documento Word corresponde, para que
 * sea directo saber dónde pegarla.
 *
 * Uso:
 *   1. docker compose up -d   (desde la raíz del repo, con los 6 contenedores)
 *   2. cd scripts/screenshots
 *   3. npm install
 *   4. npm run capturar
 *
 * Las imágenes quedan en scripts/screenshots/capturas/, numeradas en el
 * orden en que aparecen en el documento.
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";
const SWAGGER_URL = process.env.SWAGGER_URL ?? "http://localhost:3000/api/docs";
const GRAPHQL_URL = process.env.GRAPHQL_URL ?? "http://localhost:3000/graphql";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@rentar.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "AdminRentar2026!";

const OUT_DIR = path.join(__dirname, "capturas");
fs.mkdirSync(OUT_DIR, { recursive: true });

let contador = 0;
async function shot(page, nombre, seccionDoc) {
  contador += 1;
  const archivo = `${String(contador).padStart(2, "0")}-${nombre}.png`;
  // fullPage:true rompe con elementos position:fixed (los modales de
  // Bootstrap lo son): al agrandar el viewport para capturar todo el
  // scroll, el modal queda "pegado" en su posición vieja y se superpone
  // con el contenido de abajo (efecto fantasma). Como ninguna pantalla de
  // esta app necesita scroll, alcanza con el viewport normal.
  await page.screenshot({
    path: path.join(OUT_DIR, archivo),
  });
  console.log(`[${archivo}] -> ${seccionDoc}`);
}

// Formatea una fecha como la espera un <input type="datetime-local">
function fechaLocal(diasDesdeHoy, hora = 10) {
  const d = new Date();
  d.setDate(d.getDate() + diasDesdeHoy);
  d.setHours(hora, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

// Varias acciones de la app encadenan dos alertas de SweetAlert2 (una de
// confirmación y, si se confirma, una de resultado) — por eso esta función
// solo hace click y no espera a que "desaparezca" el popup: si hay una
// segunda alerta encadenada, hay que llamarla de nuevo para esa.
async function swalBoton(page, texto) {
  await page.locator(".swal2-popup").waitFor({ state: "visible" });
  await page.getByRole("button", { name: texto, exact: true }).click();
}

async function swalCerrado(page) {
  await page
    .locator(".swal2-popup")
    .waitFor({ state: "hidden", timeout: 5000 })
    .catch(() => {});
}

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/login`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /iniciar sesión/i }).click();
  await page.waitForLoadState("networkidle");
}

async function logout(page) {
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.waitForURL(/\/login$/);
}

(async () => {
  const sufijo = Date.now().toString().slice(-6);
  const patenteTest = `TST${sufijo}`;
  const clienteEmail = `test.hito2.${sufijo}@rentar.com`;
  const clientePassword = "TestHito2!";

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // Los modales de Bootstrap (y su backdrop) tienen una transición de fade.
  // El renderer headless a veces capturó la pantalla a mitad de esa
  // animación, mezclando visualmente el modal con el contenido de atrás
  // ("fantasma"). Desactivar animaciones/transiciones globalmente es la
  // forma estándar de evitar ese problema en capturas automatizadas.
  // addInitScript (no addStyleTag) porque el script hace varios goto(): hay
  // que re-inyectar esto en cada navegación, no solo en la página actual.
  //
  // Excepción: /graphql (Apollo Server Playground) arranca con opacity:0 y
  // depende de que termine su animación CSS "playgroundIn" para hacerse
  // visible — sin esa animación, queda invisible para siempre (pantalla en
  // blanco, solo el fondo). Por eso el override se salta en esa ruta.
  await page.addInitScript(() => {
    const estilo = document.createElement("style");
    estilo.textContent = `*, *::before, *::after {
      transition: none !important;
      animation: none !important;
    }`;
    document.addEventListener("DOMContentLoaded", () => {
      if (location.pathname.includes("/graphql")) return;
      document.head.appendChild(estilo);
    });
  });

  try {
    // Preflight: avisar claro si el front no responde, en vez de fallar feo más adelante.
    try {
      await page.goto(BASE_URL, { timeout: 8000 });
    } catch {
      throw new Error(
        `No se pudo conectar a ${BASE_URL}. ¿Está levantado "docker compose up -d"?`,
      );
    }

    // ---------------------------------------------------------------
    // Pruebas > 2. Clientes y login — login como admin
    // ---------------------------------------------------------------
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await shot(page, "login-admin-home", "Pruebas > 2. Clientes y login — Home Administrador");

    // ---------------------------------------------------------------
    // Pruebas > 1. Alta y validaciones de Vehículos (REST, vía Vehicle Service)
    // ---------------------------------------------------------------
    await page.goto(`${BASE_URL}/vehiculos`);
    await shot(page, "vehiculos-lista", "Pruebas > 1. Alta de Vehículos — listado inicial (ABM vía gRPC)");

    await page.getByRole("button", { name: "+ Nuevo Vehículo" }).click();
    await page.locator('input[name="patente"]').fill(patenteTest);
    await page.locator('input[name="marca"]').fill("Fiat");
    await page.locator('input[name="modelo"]').fill("Cronos");
    await page.locator('input[name="anio"]').fill("2024");
    await page.locator('input[name="color"]').fill("Rojo");
    await page.locator('select[name="tipoVehiculo"]').selectOption("SEDAN");
    await page.locator('input[name="precioDiario"]').fill("15000");
    await shot(page, "vehiculos-alta-form", "Pruebas > 1. Alta de Vehículos — formulario completo");

    await page.getByRole("button", { name: "Guardar Vehículo" }).click();
    await swalBoton(page, "OK");
    await shot(page, "vehiculos-alta-ok", "Pruebas > 1. Alta de Vehículos — vehículo creado (201)");

    // Editar: modificar el precio diario del vehículo recién creado
    const filaVehiculo = page.locator("tr", { hasText: patenteTest });
    await filaVehiculo.getByRole("button", { name: "Editar" }).click();
    await page.locator('input[name="precioDiario"]').fill("17500");
    await shot(page, "vehiculos-editar-form", "Pruebas > 1. Alta de Vehículos — modificación de precio (patente inhabilitada)");
    await page.getByRole("button", { name: "Guardar Vehículo" }).click();
    await swalBoton(page, "OK");
    await swalCerrado(page);

    // Baja lógica: confirm -> éxito son dos alertas encadenadas
    await filaVehiculo.getByRole("button", { name: "Baja" }).click();
    await page.getByText("¿Dar de baja?").waitFor();
    await shot(page, "vehiculos-baja-confirm", "Pruebas > 1. Alta de Vehículos — confirmación de baja lógica");
    await swalBoton(page, "Sí, dar de baja");
    await swalBoton(page, "OK");
    await swalCerrado(page);
    // La grilla se refresca en segundo plano tras cerrar la alerta (no está
    // encadenado al click de "OK"), así que esperamos a que el badge de la
    // fila realmente cambie antes de capturar — si no, hay riesgo de sacar
    // la foto con el estado viejo todavía en pantalla.
    await filaVehiculo.getByText("No", { exact: true }).waitFor();
    await shot(page, "vehiculos-baja-ok", "Pruebas > 1. Alta de Vehículos — vehículo dado de baja (Activo = No)");

    // Reactivar (vuelve a activo true vía el switch del modal de edición)
    await filaVehiculo.getByRole("button", { name: "Editar" }).click();
    await page.locator("#activo-switch").check();
    await page.getByRole("button", { name: "Guardar Vehículo" }).click();
    await swalBoton(page, "OK");
    await swalCerrado(page);
    await filaVehiculo.getByText("Sí", { exact: true }).waitFor();
    await shot(page, "vehiculos-reactivado", "Pruebas > 1. Alta de Vehículos — reactivación (Activo = Sí)");

    // ---------------------------------------------------------------
    // Pruebas > 2. Clientes y login (REST, vía Customer Service + JWT)
    // ---------------------------------------------------------------
    await page.goto(`${BASE_URL}/clientes`);
    await shot(page, "clientes-lista", "Pruebas > 2. Clientes y login — listado inicial (ABM vía gRPC)");

    await page.getByRole("button", { name: "+ Nuevo Cliente" }).click();
    await page.locator('input[name="documento"]').fill(`4${sufijo}`);
    await page.locator('input[name="nombre"]').fill("Test");
    await page.locator('input[name="apellido"]').fill("Hito2");
    await page.locator('input[name="email"]').fill(clienteEmail);
    await page.locator('input[name="password"]').fill(clientePassword);
    await page.locator('input[name="fechaNacimiento"]').fill("1998-05-20");
    await shot(page, "clientes-alta-form", "Pruebas > 2. Clientes y login — formulario de alta");

    await page.getByRole("button", { name: "Guardar Cliente" }).click();
    await swalBoton(page, "OK");
    await swalCerrado(page);
    await shot(page, "clientes-alta-ok", "Pruebas > 2. Clientes y login — cliente creado (201)");

    // Baja lógica + reactivación: evidencia del fix del Hito 1 (UpdateClienteDto sin "activo").
    // Baja: confirm -> éxito son dos alertas encadenadas, igual que en vehículos.
    const filaCliente = page.locator("tr", { hasText: clienteEmail });
    await filaCliente.getByRole("button", { name: "Baja" }).click();
    await swalBoton(page, "Sí, dar de baja");
    await swalBoton(page, "OK");
    await swalCerrado(page);
    await filaCliente.getByText("No", { exact: true }).waitFor();
    await shot(page, "clientes-baja-ok", "Pruebas > 2. Clientes y login — cliente dado de baja (Activo = No)");

    await filaCliente.getByRole("button", { name: "Editar" }).click();
    await page.locator("#activo-switch").check();
    await shot(page, "clientes-reactivar-form", "Pruebas > 2. Clientes y login — reactivación (fix: activo ahora es editable)");
    await page.getByRole("button", { name: "Guardar Cliente" }).click();
    await swalBoton(page, "OK");
    await swalCerrado(page);
    await filaCliente.getByText("Sí", { exact: true }).waitFor();
    await shot(page, "clientes-reactivado", "Pruebas > 2. Clientes y login — cliente reactivado (Activo = Sí)");

    // ---------------------------------------------------------------
    // Pruebas > Gestión de Reservas (vista administrador, con filtros)
    // ---------------------------------------------------------------
    await page.goto(`${BASE_URL}/reservas`);
    // La query dispara sola al montar el componente; esperamos a que
    // termine (desaparece el botón "Buscando...") para no capturar el
    // estado de carga a mitad de camino.
    await page
      .getByRole("button", { name: "Buscando..." })
      .waitFor({ state: "hidden" })
      .catch(() => {});
    await shot(page, "admin-gestion-reservas", "Pruebas > 5. Historial y consulta de reservas — vista Administrador con filtros");

    await logout(page);

    // ---------------------------------------------------------------
    // Login como el cliente recién creado
    // ---------------------------------------------------------------
    await login(page, clienteEmail, clientePassword);
    await shot(page, "cliente-home", "Pruebas > 2. Clientes y login — Home Cliente, login con credenciales del cliente creado");

    // ---------------------------------------------------------------
    // Pruebas > 3. Disponibilidad (GraphQL, vía Vehicle Service)
    // ---------------------------------------------------------------
    await page.goto(`${BASE_URL}/cliente/disponibilidad`);
    const inicio = fechaLocal(20, 10);
    const fin = fechaLocal(22, 10);
    await page.locator('input[name="fechaInicio"]').fill(inicio);
    await page.locator('input[name="fechaFin"]').fill(fin);
    await page.getByRole("button", { name: "Buscar Disponibilidad" }).click();
    await page.waitForSelector("table tbody tr");
    await shot(page, "disponibilidad-resultados", "Pruebas > 3. Disponibilidad — resultados con importeTotal calculado por el Gateway");

    // ---------------------------------------------------------------
    // Pruebas > 4. Alta de reserva — coordinación de los 3 servicios
    // ---------------------------------------------------------------
    await page.getByRole("button", { name: "Reservar" }).first().click();
    await page.getByRole("heading", { name: "Confirmar reserva" }).waitFor();
    await shot(page, "reserva-confirmar", "Pruebas > 4. Alta de reserva — modal de confirmación con importe");
    // Confirmar -> éxito son dos alertas encadenadas. No se saca captura acá
    // después de cerrar el éxito: la grilla de disponibilidad se refresca en
    // segundo plano (misma carrera que en Vehículos/Clientes) y no aporta
    // nada que no muestre mejor la navegación a "Mis Reservas" de abajo, que
    // sí carga datos frescos vía un goto nuevo.
    await swalBoton(page, "Confirmar reserva");
    await swalBoton(page, "OK");
    await swalCerrado(page);

    // ---------------------------------------------------------------
    // Mis Reservas + cancelación — prueba real de "coordina Customer +
    // Vehicle + Rental Service" (la reserva recién creada aparece acá)
    // ---------------------------------------------------------------
    await page.goto(`${BASE_URL}/cliente/reservas`);
    await shot(page, "mis-reservas-confirmada", "Pruebas > 4. Alta de reserva — \"Mis Reservas\", estado CONFIRMADA (coordina Customer + Vehicle + Rental Service)");

    await page.getByRole("button", { name: "Cancelar" }).first().click();
    await page.getByText("¿Cancelar reserva?").waitFor();
    // Confirmar -> éxito son dos alertas encadenadas
    await swalBoton(page, "Sí, cancelar");
    await swalBoton(page, "OK");
    await swalCerrado(page);
    await shot(page, "mis-reservas-cancelada", "Pruebas > 4. Alta de reserva — reserva CANCELADA (estado del vehículo vuelve a DISPONIBLE)");

    // ---------------------------------------------------------------
    // Pruebas > 5. Historial y consulta de reservas (GraphQL)
    // ---------------------------------------------------------------
    await page.goto(`${BASE_URL}/cliente/historial`);
    await shot(page, "historial-cliente", "Pruebas > 5. Historial y consulta de reservas — vista Cliente, reserva cancelada aparece con cantidadDias e importeTotal");

    await logout(page);

    // ---------------------------------------------------------------
    // Extra — Documentación de la API
    // ---------------------------------------------------------------
    await page.goto(SWAGGER_URL);
    await page.waitForSelector("text=Rentar API");
    await shot(page, "swagger-home", "Extra — Documentación de la API — Swagger, listado de endpoints");

    await page.getByText("POST", { exact: true }).first().click();
    await page.waitForTimeout(300);
    await shot(page, "swagger-endpoint-expandido", "Extra — Documentación de la API — respuestas de error documentadas (400/401/403/409)");

    // Intentar abrir el explorador de schema de GraphiQL (tab "SCHEMA") para
    // mostrar las descripciones agregadas resultó más frágil que útil: la
    // UI interna de GraphiQL no es estable para automatizar (en una corrida
    // llegó a quedar en blanco). Nos quedamos con la vista simple, que
    // siempre funciona; si alguien quiere esa captura mejor, ver nota en el
    // README (abrirla a mano lleva 10 segundos).
    await page.goto(GRAPHQL_URL);
    await page.waitForTimeout(800);
    await shot(page, "graphql-home", "Extra — Documentación de la API — GraphQL disponible en /graphql");

    console.log(`\nListo: ${contador} capturas guardadas en ${OUT_DIR}`);
  } catch (err) {
    console.error("\nFalló la captura:", err.message);
    await shot(page, "ERROR", "estado al momento del error (para diagnosticar)").catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
