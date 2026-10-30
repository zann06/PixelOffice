# Design System — PixelOffice

## 1. Principles

- Consistent, calm, high-contrast, pixel-inspired.
- Data density appropriate for work management.
- Pixel art is a visual layer, not a replacement for accessible components.
- Prefer reusable tokens/components over one-off styling.
- All visual states must work in light/dark themes if both themes are implemented.

## 2. Tokens

Define tokens as CSS variables and map them into Tailwind. Updated 2026-10-29 to the implemented **light "clean & bright" theme** matching the reference image; contrast-checked shades are used for text accents.

```css
:root {
  --color-bg: #f4f2ec;
  --color-surface: #ffffff;
  --color-surface-raised: #f6f4ee;
  --color-border: #ddd8cb;
  --color-text: #26314b;
  --color-text-muted: #5f6980;
  --color-primary: #2e3a52;       /* navy — CTAs, as in the reference */
  --color-primary-strong: #1f2940;
  --color-info: #2b62c4;
  --color-warning: #a8761c;
  --color-danger: #c9454f;
  --color-success: #1d9e74;
  --radius-card: 12px;
  --radius-control: 8px;
  --space-unit: 4px;
  --pixel-grid: 16px;
}
```

The earlier dark navy palette (bg `#101318`, mint primary `#75e0b3`, …) remains a documented alternate direction; only the light theme is implemented today. The pixel scene uses its own independent palette (`src/features/pixel-office/sprites.ts`) tuned to the reference's bright, warm tones, rendered at a 3× internal render scale with whole-logical-pixel snap for crisp edges; characters are 18×28 chunky sprites with 4 hair variants, two-tone shading, and idle/work/walk poses, upgraded from 16×24 per 2026-11-29 user feedback. App chrome (Tailwind tokens) remains light-only by explicit user decision. The dotted canvas background (`src/index.css`) provides a paper-like texture that keeps the pixel art from feeling flat, and card lift (`card-lift`) gives UI depth separate from the scene's 3/4-depth walls.

Never rely on these colors alone to communicate meaning. Use text, icons, and accessible labels. Check contrast ratios with automated and manual testing.

## 3. Typography

- Body: readable sans-serif system font.
- Headings: same family, medium/semibold weight.
- Pixel font: optional decorative use only; never use for long body copy or dense data.
- Base body size: 14–16px; dense table text should not fall below 12–13px without a strong reason.
- Use tabular numerals for percentages, counts, and dates where helpful.

## 4. Spacing and shape

Use a 4px spacing scale: 4, 8, 12, 16, 24, 32, 40, 48.
Cards: 12px radius. Controls: 8px radius. Pixel scene assets retain hard pixel edges; ordinary UI may use rounded modern components.

## 5. Component inventory

Build and reuse:
- `AppShell`, `Sidebar`, `Topbar`, `WorkspaceSwitcher`
- `PageHeader`, `Breadcrumbs`
- `MetricCard`, `ProgressBar`, `StatusBadge`
- `ProgramCard`, `TaskRow`, `TaskBoard`, `TaskDetailPanel`
- `MeetingCard`, `AgendaEditor`, `DecisionActionItem`
- `MemberAvatar`, `DepartmentCard`
- `PixelOfficeScene`, `PixelCharacter`, `OfficeRoom`, `SceneLegend`
- `FilterBar`, `SearchInput`, `DateRangeFilter`
- `EmptyState`, `ErrorState`, `LoadingSkeleton`, `ConfirmDialog`
- `Toast`, `AccessibleDialog`, `FormField`
- `PermissionGate` for presentation only (never a substitute for server-side authorization)

## 6. Status labels

Work program:
- Planned — “Direncanakan”
- Active — “Berjalan”
- Blocked — “Terhambat”
- Completed — “Selesai”
- Archived — “Diarsipkan”

Task:
- Todo — “Belum dikerjakan”
- In progress — “Dikerjakan”
- Blocked — “Terhambat”
- In review — “Menunggu review”
- Done — “Selesai”
- Cancelled — “Dibatalkan”

Each badge includes text; icon and color are supplemental.

## 7. Pixel scene interaction

- The scene must not trap keyboard focus.
- Provide a semantic roster/list of members and active work beside or below the scene.
- Pointer hover can show a tooltip, but essential information must be available on click/focus.
- Character movement respects reduced-motion preference.
- Avoid infinite animation loops when the scene is offscreen.
- Use static fallback art if canvas/sprites fail to load.
- Keep scene updates stable; do not move a character on every render.
- Add a legend explaining what each visual state means.

## 8. Responsive behavior

- Mobile: prioritize tasks, programs, and meetings; collapse or hide the scene behind an explicit “Office view” toggle.
- Tablet: use a compact scene and two-column cards where space permits.
- Desktop: dashboard can show metrics, deadlines, and the pixel office together.
- Avoid horizontal scrolling for essential forms and task lists.

## 9. Accessibility checklist

- Keyboard-accessible navigation and forms.
- Visible focus styles.
- Correct headings and labels.
- Accessible names for icon-only buttons.
- Status not communicated by color alone.
- Reduced-motion support.
- Minimum practical target size for touch controls.
- Errors explained in text and associated with fields.
- Screen-reader alternative for canvas/pixel scene.
