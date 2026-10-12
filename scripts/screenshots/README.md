# Capturas de pantalla — Hito 2

Herramienta de uso puntual para generar las capturas de pantalla que pide la
consigna ("Pruebas: Opción 1 ... con las correspondientes capturas de
pantalla"). No es parte de la app — vive en `scripts/`, separada de
`frontend/` y `backend/`, y no se levanta con Docker Compose.

## Uso

1. Levantar todo el proyecto (los 6 contenedores deben estar arriba):

   ```bash
   docker compose up -d
   ```

2. Instalar dependencias (solo la primera vez):

   ```bash
   cd scripts/screenshots
   npm install
   npx playwright install chromium
   ```

3. Correr el script:

   ```bash
   npm run capturar
   ```

Las imágenes quedan en `scripts/screenshots/capturas/`, numeradas en el
orden en que aparecen en el documento (`01-...`, `02-...`, etc.). En la
consola, cada línea dice a qué sección del documento Word corresponde esa
captura — por ejemplo:

```
[01-login-admin-home.png] -> Pruebas > 2. Clientes y login — Home Administrador
```

Así se sabe exactamente dónde pegar cada una sin tener que adivinar.

## Notas

- La última captura (`graphql-home`) es la vista simple de GraphiQL. Se
  probó automatizar el explorador de schema (tab "SCHEMA" → query
  `vehiculosDisponibles`, para mostrar las descripciones agregadas), pero
  esa interacción resultó demasiado frágil (la UI interna de GraphiQL no es
  estable para automatizar, llegó a renderizar en blanco), así que se sacó
  del script. Si querés esa captura mejor para la documentación, abrí
  http://localhost:3000/graphql a mano, hacé click en "SCHEMA" a la derecha
  y después en `vehiculosDisponibles` — 10 segundos.

- El script crea datos de prueba nuevos en cada corrida (patente, documento y
  email con un sufijo único), así que se puede correr las veces que haga
  falta sin chocar con datos existentes.
- Si falla en algún paso, igual guarda una captura del estado en el momento
  del error (`XX-ERROR.png`) para poder diagnosticar qué pasó.
- Las carpetas `capturas/` y `node_modules/` no se suben al repo (ver
  `.gitignore` en esta misma carpeta).
