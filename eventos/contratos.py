"""Contratos de eventos de Rentar (Hito 3).

Fuente única de verdad de la mensajería asíncrona: nombres de evento (que se
usan como routing key), colas, qué eventos recibe cada cola y qué campos debe
traer cada payload. Es el equivalente a proto/ para la comunicación síncrona.

La documentación de cada evento (productor, consumidores, ejemplo) está en
eventos/README.md. Cualquier cambio acá se acuerda con todo el equipo.
"""

# Exchange principal (tipo topic): todos los eventos se publican acá y el
# broker los copia a cada cola cuyo binding coincida con el nombre del evento.
EXCHANGE = "rentar.eventos"

# Mensajes que un consumidor no pudo procesar (dead letter): quedan guardados
# en COLA_ERRORES para inspeccionarlos desde la consola de RabbitMQ.
EXCHANGE_ERRORES = "rentar.eventos.dlx"
COLA_ERRORES = "rentar.errores"

# --- Nombres de evento (routing keys) -------------------------------------

VERIFICACION_SOLICITADA = "vehiculos.verificacion.solicitada"
VERIFICACION_RESULTADO = "vehiculos.verificacion.resultado"

EXTERNOS_REGISTRADOS = "vehiculos.externos.registrados"
EXTERNOS_VALIDACION_PATENTE = "vehiculos.externos.validacion.patente"
EXTERNOS_VALIDACION_TITULARIDAD = "vehiculos.externos.validacion.titularidad"
EXTERNOS_VALIDACION_COMPLETADA = "vehiculos.externos.validacion.completada"

RESERVA_CONFIRMADA = "reserva.confirmada"
MANTENIMIENTO_RESULTADO = "mantenimiento.resultado"

# --- Colas (una por consumidor y responsabilidad) --------------------------
# Convención: <servicio que consume>.<qué procesa>

COLA_REGISTROS_VERIFICACION = "registros.verificacion"
COLA_REGISTROS_EXTERNOS_PATENTE = "registros.externos-patente"
COLA_REGISTROS_EXTERNOS_TITULARIDAD = "registros.externos-titularidad"

COLA_VEHICULOS_VERIFICACION = "vehiculos.verificacion-resultado"
COLA_VEHICULOS_EXTERNOS_VALIDACIONES = "vehiculos.externos-validaciones"
COLA_VEHICULOS_EXTERNOS_COMPLETADA = "vehiculos.externos-completada"

COLA_MANTENIMIENTO_RESERVAS = "mantenimiento.reservas-confirmadas"
COLA_RESERVAS_MANTENIMIENTO = "reservas.mantenimiento-resultado"

# Qué eventos llegan a cada cola. vehiculos.externos.registrados va a dos
# colas: las dos validaciones corren en paralelo e independientes.
TOPOLOGIA = {
    COLA_REGISTROS_VERIFICACION: [VERIFICACION_SOLICITADA],
    COLA_REGISTROS_EXTERNOS_PATENTE: [EXTERNOS_REGISTRADOS],
    COLA_REGISTROS_EXTERNOS_TITULARIDAD: [EXTERNOS_REGISTRADOS],
    COLA_VEHICULOS_VERIFICACION: [VERIFICACION_RESULTADO],
    COLA_VEHICULOS_EXTERNOS_VALIDACIONES: [
        EXTERNOS_VALIDACION_PATENTE,
        EXTERNOS_VALIDACION_TITULARIDAD,
    ],
    COLA_VEHICULOS_EXTERNOS_COMPLETADA: [EXTERNOS_VALIDACION_COMPLETADA],
    COLA_MANTENIMIENTO_RESERVAS: [RESERVA_CONFIRMADA],
    COLA_RESERVAS_MANTENIMIENTO: [MANTENIMIENTO_RESULTADO],
}

# --- Estructura de los payloads -------------------------------------------

CAMPOS = {
    VERIFICACION_SOLICITADA: ("vehiculoId", "patente"),
    VERIFICACION_RESULTADO: ("vehiculoId", "patente", "resultado"),
    EXTERNOS_REGISTRADOS: ("vehiculoExternoId", "clienteId", "patente"),
    EXTERNOS_VALIDACION_PATENTE: ("vehiculoExternoId", "patente", "resultado"),
    EXTERNOS_VALIDACION_TITULARIDAD: (
        "vehiculoExternoId",
        "clienteId",
        "documento",
        "patente",
        "resultado",
    ),
    EXTERNOS_VALIDACION_COMPLETADA: ("vehiculoExternoId",),
    RESERVA_CONFIRMADA: ("reservaId", "vehiculoId", "fechaInicio", "fechaFin"),
    MANTENIMIENTO_RESULTADO: ("reservaId", "vehiculoId", "resultado"),
}

RESULTADOS = {
    VERIFICACION_RESULTADO: ("VALIDADO", "ROBADO"),
    EXTERNOS_VALIDACION_PATENTE: ("VALIDADO", "RECHAZADO"),
    EXTERNOS_VALIDACION_TITULARIDAD: ("VALIDADO", "RECHAZADO"),
    MANTENIMIENTO_RESULTADO: ("REALIZADO", "NO_REALIZADO"),
}


def validar(tipo: str, payload: dict) -> None:
    """Rechaza payloads que no respetan el contrato, antes de publicarlos o
    de pasárselos a un consumidor."""
    if tipo not in CAMPOS:
        raise ValueError(f"Tipo de evento desconocido: {tipo}")
    faltantes = [campo for campo in CAMPOS[tipo] if campo not in payload]
    if faltantes:
        raise ValueError(f"{tipo}: faltan los campos {', '.join(faltantes)}")
    if tipo in RESULTADOS and payload["resultado"] not in RESULTADOS[tipo]:
        raise ValueError(
            f"{tipo}: resultado inválido {payload['resultado']!r}, "
            f"se esperaba uno de {', '.join(RESULTADOS[tipo])}"
        )
