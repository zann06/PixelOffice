import type { SceneMemberVM } from './sceneViewModel'
import { ACTIVITY_COLOR, ACTIVITY_SHORT, SCENE_LEGEND } from './sceneLabels'
import { RoleBadge } from '../../components/ui/StatusBadge'

interface Props {
  members: SceneMemberVM[]
  selectedUserId: string | null
  onSelectMember: (userId: string) => void
}

/**
 * Tiny CSS-only pixel portrait derived from the same deterministic appearance
 * as the canvas sprite (shirt / skin / hair). Purely decorative.
 */
function PixelAvatar({ member }: { member: SceneMemberVM }) {
  return (
    <span
      aria-hidden
      className="relative h-8 w-8 shrink-0 overflow-hidden rounded-[6px] border border-black/20 shadow-[inset_0_-3px_0_rgba(0,0,0,0.12)]"
      style={{ backgroundColor: member.colors.shirt }}
    >
      <span className="absolute left-1.5 top-1.5 h-3.5 w-5 rounded-[2px]" style={{ backgroundColor: member.colors.skin }} />
      <span className="absolute left-1.5 top-0.5 h-2 w-5 rounded-[2px]" style={{ backgroundColor: member.colors.hair }} />
      <span className="absolute left-2.5 top-2.5 h-1 w-1" style={{ backgroundColor: member.colors.eye }} />
      <span className="absolute right-2.5 top-2.5 h-1 w-1" style={{ backgroundColor: member.colors.eye }} />
      <span className="absolute inset-x-0 bottom-0 h-1" style={{ backgroundColor: member.colors.pants }} />
    </span>
  )
}

/**
 * Semantic list alternative to the pixel scene (docs/REFERENCE.md, PRD P0 #11):
 * same members, same derived states, plain HTML list.
 */
export function MemberRoster({ members, selectedUserId, onSelectMember }: Props) {
  return (
    <ul className="flex flex-col gap-1" aria-label="Daftar anggota dan status kerja mereka">
      {members.map((member) => {
        const selected = selectedUserId === member.userId
        const taskNote =
          member.activeTaskCount + member.blockedTaskCount + member.reviewTaskCount === 0
            ? 'tidak ada tugas aktif'
            : [
                member.activeTaskCount > 0 ? `${member.activeTaskCount} dikerjakan` : null,
                member.blockedTaskCount > 0 ? `${member.blockedTaskCount} terhambat` : null,
                member.reviewTaskCount > 0 ? `${member.reviewTaskCount} review` : null,
              ]
                .filter(Boolean)
                .join(' · ')
        return (
          <li key={member.userId}>
            <button
              type="button"
              onClick={() => onSelectMember(member.userId)}
              aria-pressed={selected}
              className={`group flex w-full items-center gap-2.5 rounded-[9px] border px-2.5 py-2 text-left text-sm transition-colors ${
                selected
                  ? 'border-info bg-info/10 shadow-[inset_3px_0_0_#2b62c4]'
                  : 'border-transparent hover:border-border-main hover:bg-surface-raised'
              }`}
            >
              <PixelAvatar member={member} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="block truncate font-medium">{member.displayName}</span>
                  {member.activity === 'meeting' && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                      rapat
                    </span>
                  )}
                </span>
                <span className="block truncate text-[11px] text-text-muted">
                  {member.departmentName ?? 'Tanpa divisi'} · {taskNote}
                </span>
              </span>
              <span className="hidden shrink-0 sm:block">
                <RoleBadge role={member.role} />
              </span>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${ACTIVITY_COLOR[member.activity]}`}>
                {ACTIVITY_SHORT[member.activity]}
                {member.activity === 'blocked' && member.blockedTaskCount > 0 ? ` ${member.blockedTaskCount}` : ''}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function SceneLegend() {
  return (
    <div className="rounded-[12px] border border-border-main bg-surface px-4 py-3">
      <p className="pixel-label mb-2 text-[10px] text-text-muted">Legenda scene</p>
      <ul className="grid gap-1.5 text-xs text-text-muted sm:grid-cols-2">
        {SCENE_LEGEND.map((item) => (
          <li key={item.activity} className="flex items-start gap-2">
            <span
              aria-hidden
              className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border text-[10px] font-bold ${ACTIVITY_COLOR[item.activity]}`}
            >
              {item.glyph}
            </span>
            <span>{item.description}</span>
          </li>
        ))}
        <li className="flex items-start gap-2 sm:col-span-2">
          <span
            aria-hidden
            className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border border-border-main bg-surface-raised text-[10px] font-bold text-text-muted"
          >
            ·
          </span>
          <span>Tanpa divisi / pengamat: Aula · Setiap divisi duduk di ruangannya · Papan proyek menampilkan status program kerja</span>
        </li>
      </ul>
    </div>
  )
}
