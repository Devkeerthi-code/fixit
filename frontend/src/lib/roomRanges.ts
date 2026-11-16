/*
  Same rules as the backend's RoomRangeParser, so the warden sees the room count (and any mistake)
  while typing "101-120, 201-205, G1" instead of after submitting.
*/
export const MAX_ROOMS = 500;
const RANGE = /^([A-Za-z]*)(\d+)\s*-\s*([A-Za-z]*)(\d+)$/;
const SINGLE = /^[A-Za-z0-9][A-Za-z0-9/-]{0,15}$/;

export type RoomParse = { ok: true; rooms: string[] } | { ok: false; error: string };

function expandRange(rooms: Set<string>, part: string, m: RegExpMatchArray): string | null {
  const prefix = (m[1] ?? "").toUpperCase();
  const endPrefix = (m[3] ?? "").toUpperCase();
  if (endPrefix && endPrefix !== prefix) return `"${part}" mixes two prefixes`;
  const startDigits = m[2] ?? "";
  const start = Number.parseInt(startDigits, 10);
  const end = Number.parseInt(m[4] ?? "", 10);
  if (end < start) return `"${part}" goes backwards`;
  if (end - start + 1 > MAX_ROOMS) return `"${part}" is more than ${MAX_ROOMS} rooms`;
  const width = startDigits.length; // keeps zero padding: G01-G05 stays G01..G05
  for (let n = start; n <= end; n++) rooms.add(prefix + String(n).padStart(width, "0"));
  return null;
}

export function parseRoomRanges(input: string): RoomParse {
  const rooms = new Set<string>();
  for (const raw of input.split(/[,;\n]/)) {
    const part = raw.trim();
    if (!part) continue;
    const range = part.match(RANGE);
    if (range) {
      const error = expandRange(rooms, part, range);
      if (error) return { ok: false, error };
    } else if (SINGLE.test(part)) {
      rooms.add(part.toUpperCase());
    } else {
      return { ok: false, error: `"${part}" isn't a room number or a range like 101-120` };
    }
    if (rooms.size > MAX_ROOMS) return { ok: false, error: `A block can have at most ${MAX_ROOMS} rooms` };
  }
  if (rooms.size === 0) return { ok: false, error: "Add at least one room, e.g. 101-120" };
  return { ok: true, rooms: [...rooms] };
}

/** Total rooms across several block specs; invalid specs count as zero. */
export function roomTotal(specs: string[]): number {
  return specs.reduce((sum, s) => {
    const p = parseRoomRanges(s);
    return sum + (p.ok ? p.rooms.length : 0);
  }, 0);
}
