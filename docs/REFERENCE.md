# Visual Reference — PixelOffice

This file is the shared visual source of truth. All contributors and code-generation tools should read it before implementing UI.

## Product identity

PixelOffice is a **real productivity workspace represented through a pixel-art office**. It is not a game. The interface should feel calm, useful, organized, and slightly playful—not childish or noisy.

## Reference direction

Use these visual ideas as inspiration, not as assets to copy:
- Cozy, compact 16-bit office scenes
- Clear top-down or slight isometric room layout
- Small characters with restrained idle/walk animations
- Modular desks, meeting rooms, plants, monitors, notice boards
- A clean modern dashboard around the pixel-art scene

Do not copy Growtopia, Stardew Valley, Habbo, or another game's recognizable sprites, UI, characters, tiles, names, or maps. Create original assets or use assets with verified compatible licenses.

## Visual hierarchy

1. **Work data is primary:** status, owner, due date, progress, blockers.
2. **Pixel office is a summary:** clicking a person/room opens the relevant work details.
3. **Navigation is predictable:** Dashboard, Work Programs, Tasks, Meetings, Departments, Members, Settings.
4. **Decorative detail is restrained:** the scene should not compete with urgent deadlines or accessibility cues.

## Layout

### Desktop
- Left sidebar: workspace switcher and main navigation.
- Top bar: current workspace/department, search, notifications, user menu.
- Main content: page title, primary action, key metrics, current work.
- Pixel office panel: prominent on dashboard, optional/collapsible.
- Details: use a side panel or page, not a tiny unreadable pixel dialog.

### Mobile
- Collapse navigation into a menu or bottom navigation.
- Make task and meeting lists the default primary interface.
- Allow the office scene to pan or zoom only when useful; never require fine pointer movement to access data.
- Provide an accessible list alternative.

## Scene rules
- Use a consistent tile grid. Recommended logical tile size: 16×16 or 32×32 pixels; render at integer scale where possible (now 3× internal render scale with whole-logical-pixel snap for crisp edges).
- Use nearest-neighbor scaling (`image-rendering: pixelated`) for pixel sprites.
- Keep sprite sheets on a documented grid with transparent backgrounds.
- Keep animation frame dimensions consistent. Characters are 18×28 pixels with 4 hair variants, two-tone shading, and idle/work/walk poses (upgraded from 16×24).
- Scene coordinates must not determine permissions or business logic.
- Clicking a character should open a semantic accessible button/list item with the same information.
- Character movement should be deterministic and driven by UI state; do not simulate presence or task activity that is not backed by data.
- Keep animations short, subtle, and interruptible. Decorative-only animation includes dust puffs, blinking, idle bob, animated cat wander, and steam (enabled via motion toggle).
- Honor `prefers-reduced-motion` and offer an in-app motion setting.
- Never encode status by color alone: pair colors with text/icons/labels.
- 3/4-depth wall/furniture: the north wall face is visible with roof cap + wall surface tilt; furniture uses chunky block3d (top face + front face) with wall shadows so the whole office reads as a tilted box.

## Pixel asset guidelines
- Original palette with limited colors per sprite.
- Consistent outline weight and light direction.
- No copyrighted game sprite extraction or generated copies of recognizable existing game assets.
- Store source files when licensing permits.
- Each third-party asset must have a record in `ASSET_LICENSES.md` with source URL, creator, license, modifications, and attribution requirements.
- Do not use assets with unclear licensing.
- Use a consistent font pairing: readable UI font for text; pixel font only for small headings or decorative labels. Body text must remain legible.
- Avoid tiny pixel fonts for long descriptions, tables, or forms.

## States that every page must define
- Loading
- Empty
- Error/retry
- Success
- Permission denied
- Offline/stale data where relevant
- Disabled
- Keyboard focus
- Reduced motion

## Interaction language
Use plain Indonesian or English consistently per locale. Avoid mixing languages in one interface by default. Use clear labels:
- “Program kerja”
- “Tugas”
- “Rapat”
- “Keputusan”
- “Penanggung jawab”
- “Tenggat”
- “Terhambat”
- “Terakhir diperbarui”

## Do not
- Add XP, coins, loot, achievements, or game-like rewards unless product scope changes.
- Make a character appear “online” based only on an open browser tab.
- Show private task titles in a public scene.
- Use animation as the only confirmation of a successful action.
- make the pixel office the only way to navigate.
