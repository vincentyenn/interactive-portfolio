"""Create a small, repeatable leather albedo tile for the authored lounge."""
import math
import random
import struct
import zlib
from pathlib import Path


WIDTH = HEIGHT = 512
OUT = Path(__file__).resolve().parents[1] / 'assets' / 'graphics' / 'lounge_leather.png'
rng = random.Random(20260926)
rows = bytearray()
for y in range(HEIGHT):
    rows.append(0)
    for x in range(WIDTH):
        broad = math.sin(x * .037 + math.sin(y * .019)) * .42 + math.sin(y * .056 + x * .011) * .28
        grain = rng.random() - .5
        pore = -.19 if rng.random() < .018 else 0
        variation = broad * 8 + grain * 15 + pore * 24
        rows.extend((max(0, min(255, round(channel + variation))) for channel in (105, 49, 29)))


def chunk(kind: bytes, data: bytes) -> bytes:
    return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data) & 0xffffffff)


OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_bytes(b'\x89PNG\r\n\x1a\n' +
                chunk(b'IHDR', struct.pack('!2I5B', WIDTH, HEIGHT, 8, 2, 0, 0, 0)) +
                chunk(b'IDAT', zlib.compress(rows, 7)) + chunk(b'IEND', b''))
print(OUT)
