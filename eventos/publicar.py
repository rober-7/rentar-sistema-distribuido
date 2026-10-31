"""Publica un evento a mano, para probar un consumidor sin depender de que
otra persona haya terminado el productor.

Uso, desde cualquier contenedor que tenga montada la carpeta eventos/:

    docker compose exec vehicle_service python -m eventos.publicar \\
        reserva.confirmada reservaId=1 vehiculoId=2 \\
        fechaInicio=2026-11-01T10:00:00 fechaFin=2026-11-05T10:00:00

Los valores numéricos se envían como números y el resto como texto.
"""

import json
import sys

from eventos import broker


def _valor(texto: str):
    try:
        return json.loads(texto)
    except json.JSONDecodeError:
        return texto


def main() -> None:
    if len(sys.argv) < 2 or any("=" not in arg for arg in sys.argv[2:]):
        print(__doc__)
        sys.exit(2)
    tipo = sys.argv[1]
    payload = {}
    for arg in sys.argv[2:]:
        clave, valor = arg.split("=", 1)
        payload[clave] = _valor(valor)
    evento = broker.publicar(tipo, payload, origen="cli-pruebas")
    print(json.dumps(evento, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
