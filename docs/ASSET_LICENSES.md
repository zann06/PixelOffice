# Asset License Ledger

Record every non-original visual asset used in PixelOffice. Do not merge assets with unclear or incompatible terms.

| Asset/file | Creator | Source URL | License/version | Changes made | Attribution required? |
|---|---|---|---|---|---|
| _Add entry before using an external asset_ | | | | | |

## Current status: no external assets

All visual assets in this repository are **original and generated in-repo**:

- The pixel office scene (`src/features/pixel-office/`) is drawn procedurally on canvas from tile/furniture primitives and small pixel matrices (`sprites.ts`, `officeMap.ts`) written for this project.
- Icons (`src/components/ui/icons.tsx`) and the logo (`LogoMark`, `public/favicon.svg`) are hand-authored SVGs created for this project.
- Typography uses system font stacks only; no third-party fonts are bundled.
- The reference image `assets/references/pixel-office-reference.png` is used for design direction only and is not rendered by the application.

No third-party sprites, fonts, sounds, or screenshots are bundled. If any external asset is introduced later, record it in the table above with its source, creator, license, modifications, and attribution requirements.

## Rules
- Prefer original assets created for this project.
- Keep license files and attribution text with the asset where required.
- Verify whether the license allows commercial use, modification, redistribution, and use in a public repository.
- Do not assume that an image found through a search engine is free to use.
- Do not copy sprites, tiles, characters, or UI from existing commercial games.
- If using AI-generated assets, record the tool and review applicable terms; do not request close copies of protected game assets.
