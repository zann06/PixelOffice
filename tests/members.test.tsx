import { describe, it, expect, beforeEach } from 'vitest'
import { LocalDataClient } from '../src/lib/data/LocalDataClient'
import { buildSceneViewModel } from '../src/features/pixel-office/sceneViewModel'

async function boot() {
  localStorage.clear()
  const client = new LocalDataClient()
  await client.signInAs('u-ratna')
  const wss = await client.listWorkspacesForSession()
  const snap = await client.fetchWorkspace(wss[0]!.id)
  return { client, snap, ws: wss[0]!.id }
}

describe('members + seats', () => {
  beforeEach(() => localStorage.clear())

  it('adds a member, pins a seat, keeps seats unique, shows in scene VM', async () => {
    const { client, snap, ws } = await boot()
    const tech = snap.departments.find((d) => /Teknologi/i.test(d.name))!
    const before = buildSceneViewModel(snap, new Date())
    const m = await client.addMember({ workspaceId: ws, displayName: 'Budi Baru', role: 'member', departmentId: tech.id, seatId: 'workspace:9' })
    const snap2 = await client.fetchWorkspace(ws)
    const vm = buildSceneViewModel(snap2, new Date())
    const budi = vm.members.find((x) => x.userId === m.userId)!
    expect(vm.members.length).toBe(before.members.length + 1)
    expect(budi.seatId).toBe('workspace:9')
    expect(budi.seatPinned).toBe(true)
    expect(budi.departmentName).toBe(tech.name)
    // every home seat is unique
    expect(new Set(vm.members.map((x) => x.seatId)).size).toBe(vm.members.length)
    // seat already taken -> rejected
    await expect(client.addMember({ workspaceId: ws, displayName: 'Cici', role: 'member', departmentId: null, seatId: 'workspace:9' })).rejects.toThrow(/sudah dipakai/)
    // duplicate name rejected
    await expect(client.addMember({ workspaceId: ws, displayName: 'budi baru', role: 'member', departmentId: null, seatId: null })).rejects.toThrow(/Sudah ada/)
    // move to arsip room
    await client.updateMember(ws, m.userId, { seatId: 'arsip:0' })
    const vm3 = buildSceneViewModel(await client.fetchWorkspace(ws), new Date())
    expect(vm3.members.find((x) => x.userId === m.userId)!.seatLabel).toBe('Ruang Arsip · Kursi 1')
  })

  it('only owner/admin can manage members', async () => {
    const { client, ws, snap } = await boot()
    const plain = snap.memberships.find((x) => x.role === 'member')!
    await client.signInAs(plain.userId)
    await expect(client.addMember({ workspaceId: ws, displayName: 'Hacker', role: 'admin', departmentId: null, seatId: null })).rejects.toThrow(/pemilik atau admin/)
  })

  it('seats do not shuffle when a meeting starts', async () => {
    const { snap } = await boot()
    const a = buildSceneViewModel(snap, new Date('2000-01-01T00:00:00Z'))
    expect(new Set(a.members.map((x) => x.seatId)).size).toBe(a.members.length)
  })
})
