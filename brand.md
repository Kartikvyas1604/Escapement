# Brand — Escapement

Live Keeper Exchange — an onchain market for MagicBlock crank slots (Escapement leases).

## Palette

Dark-native only. The product spec mandates near-black; there is no light theme.

| Token | Value | Use |
|---|---|---|
| Background | `#0A0A0A` | Page base |
| Card | `#141414` | Elevated surfaces |
| Popover | `#1A1A1A` | Menus, overlays |
| Foreground | `#EDEDED` | Primary text (soft white, no glare) |
| Muted foreground | `#A1A1AA` | Secondary text — passes 4.5:1 on background |
| Border | `#262626` | 1px separators, inputs |
| **Primary / accent** | `#22D3EE` (cyan) | CTA, focus rings, live indicators. Cyan chosen over lime `#B8FF3C` per user rule: no gold/yellow-adjacent palettes. |
| Primary foreground | `#04262C` | Text on cyan — passes AA |
| Destructive | `#F87171` | Failed ticks, errors |
| Success | `#4ADE80` | Confirmed settle, connected wallet |

## Typography

- **Display / headlines:** Instrument Serif (400) — editorial, anti-SaaS. Large sizes only.
- **UI / body:** Geist Sans.
- **Numbers / addresses / code:** Geist Mono, always with `tabular-nums`.

## Voice

- Lead with the lease: "Buy an Escapement lease", never "we integrated cranks".
- Concise, active, specific. "Settle fees" not "You can settle your fees here".
- Honest: unused leases expire, devnet is labeled devnet, no fake APY.
- Anti-tells: no purple SaaS chrome, no gradient wallpaper, no "ScheduleTask tutorial" framing.

## Logo

The mark is a **15-tooth escape wheel** — the watch mechanism that releases motion one tick at a time — engaged by a two-pallet anchor fork. It literalizes the product: discrete, metered ticks bought as a lease.

- `public/logo-mark.svg` — mark only, transparent, dark-background colors (light wheel, cyan pallets/axle).
- `public/logo-lockup.svg` — horizontal lockup with serif wordmark + mono "LIVE KEEPER EXCHANGE" tagline, for dark backgrounds.
- `public/logo-lockup-light.svg` — same lockup re-inked for light backgrounds (near-black wheel/text).
- `app/icon.svg` — favicon: mark on a near-black rounded tile.

Rules: cyan is reserved for the pallets, axle, and interactive accents — never recolor the wheel. Clear space around the mark ≥ wheel radius. No gradients, no drop shadows.
