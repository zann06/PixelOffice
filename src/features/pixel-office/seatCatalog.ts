import {
  ARSIP_SEATS,
  AULA_SEATS,
  HUMAS_SEATS,
  KETUA_SEATS,
  KEUANGAN_SEATS,
  WORKSPACE_SEATS,
  type Seat,
} from './officeMap'

/**
 * Every seat in the office has a stable id ("<room>:<index>") so a member can
 * be pinned to a specific chair (Membership.seatId) and the choice survives
 * reloads. Room order here is also the order of the "Atur kursi" pickers and
 * the spill-over order when a division's own room is full.
 */
export interface SeatRoom {
  key: string
  label: string
  seats: Seat[]
}

export const SEAT_ROOMS: SeatRoom[] = [
  { key: 'workspace', label: 'Workspace', seats: WORKSPACE_SEATS },
  { key: 'ketua', label: 'Ruang Ketua & Sekretariat', seats: KETUA_SEATS },
  { key: 'keuangan', label: 'Keuangan', seats: KEUANGAN_SEATS },
  { key: 'humas', label: 'Humas & Media', seats: HUMAS_SEATS },
  { key: 'arsip', label: 'Ruang Arsip', seats: ARSIP_SEATS },
  { key: 'aula', label: 'Aula (kursi penonton)', seats: AULA_SEATS },
]

export const makeSeatId = (roomKey: string, index: number): string => `${roomKey}:${index}`

export interface SeatRef {
  id: string
  room: SeatRoom
  index: number
  seat: Seat
  /** "Workspace · Kursi 3" */
  label: string
}

export function findSeat(id: string | null | undefined): SeatRef | null {
  if (!id) return null
  const [key, rawIndex] = id.split(':')
  const room = SEAT_ROOMS.find((r) => r.key === key)
  const index = Number(rawIndex)
  if (!room || !Number.isInteger(index)) return null
  const seat = room.seats[index]
  if (!seat) return null
  return { id, room, index, seat, label: `${room.label} · Kursi ${index + 1}` }
}

export const isValidSeatId = (id: string): boolean => findSeat(id) !== null

/** Default room for a division name (same rules the scene always used). */
export function defaultRoomForDepartment(departmentName: string | null): SeatRoom {
  const byKey = (k: string) => SEAT_ROOMS.find((r) => r.key === k)!
  if (!departmentName) return byKey('aula')
  if (/^BPH|Sekretariat/i.test(departmentName)) return byKey('ketua')
  if (/Keuangan/i.test(departmentName)) return byKey('keuangan')
  if (/Humas|Media/i.test(departmentName)) return byKey('humas')
  if (/Arsip|Dokumen/i.test(departmentName)) return byKey('arsip')
  if (/Acara/i.test(departmentName)) return byKey('aula')
  return byKey('workspace')
}
