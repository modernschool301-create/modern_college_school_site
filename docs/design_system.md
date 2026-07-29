# Design System — Modern College & School Website

The visual language for modern.edu.np. This is the authoritative reference for every page's look and feel. It sits alongside the PRD (`/docs/Modern_College_PRD.md`): the PRD says *what each page does*, this says *how the whole site looks*. Every build prompt should reference this doc and invoke the `frontend-design` skill, so the site inherits one coherent identity instead of drifting page to page.

---

## 1. Personality & Principles

**Brief:** Modern & aspirational, with a balanced-but-distinctive use of the school's signature green, rounded/soft shapes, and moderate, tasteful motion. This is a *marketing* site — its job is to impress a prospective student or parent in the first three seconds and move them toward applying.

Guiding principles:

1. **Green is the atmosphere; the bright green is the spotlight.** The site feels green everywhere through deep anchors and pale tints, but the one vivid signature green is rationed — it appears only on the actions we want taken (Apply, key links, active states). Its scarcity is what makes it powerful.
2. **Editorial, not brochure.** Generous whitespace, confident large type, strong photography given room to breathe, asymmetric rhythm. A 30-year institution can afford to look calm and established, not busy.
3. **The photography and the hero video carry the persuasion.** Design frames real imagery; it never competes with it. Great media with restrained design beats clever design with weak media.
4. **Spend boldness in one place.** The full-bleed video hero is the signature moment. Everything around it stays quiet and disciplined.
5. **Quality floor, always:** responsive to mobile, visible keyboard focus, `prefers-reduced-motion` respected, fast load.
6. **Full-width and fluid on desktop, mobile-first everywhere.** The site fills the screen — full-bleed backgrounds with comfortably-capped content — never a narrow centered column with large empty side gaps, and it works at any screen resolution from small phones to ultra-wide monitors while staying mobile-first.

---

## 2. Color

The palette is a considered green system — deep anchors, one vivid action green, pale tints, and warm near-white neutrals. Defined as CSS custom properties (Tailwind v4 `@theme` friendly).

### Brand greens

| Token | Hex | Role |
| --- | --- | --- |
| `--green-ink` | `#0E2A1C` | Deepest green. Headings on light backgrounds, high-emphasis text. |
| `--green-forest` | `#123D2A` | Anchor green. Hero base, footer, dark sections. |
| `--green-brand` | `#1F7A4D` | Primary brand green. Section accents, icons, links at rest. |
| `--green-signature` | `#3FB950` | **The vivid action green — rationed.** CTAs, active states, key highlights only. Never a background wash. |
| `--green-pale` | `#D6EADD` | Soft tint. Card borders, dividers, subtle fills. |
| `--green-mist` | `#EAF3EC` | Palest tint. Section backgrounds that should feel green without shouting. |

### Neutrals

| Token | Hex | Role |
| --- | --- | --- |
| `--paper` | `#FBFCFB` | Page background. A near-white with the faintest green warmth — never pure `#FFF`, never cream. |
| `--surface` | `#FFFFFF` | Cards and raised surfaces. |
| `--ink` | `#16211C` | Body text. Near-black with a green undertone so it sits in the family. |
| `--ink-muted` | `#5B6560` | Secondary text, captions. |
| `--ink-faint` | `#8A938E` | Hints, placeholders, metadata. |
| `--line` | `#E3EAE5` | Default hairline borders. |

### Semantic (forms & status)

| Token | Hex | Role |
| --- | --- | --- |
| `--success` | `#1F7A4D` | Success (reuses brand green — a happy accident that fits). |
| `--danger` | `#C0392B` | Errors, destructive actions. |
| `--danger-bg` | `#FBEAE8` | Error background tint. |
| `--warning` | `#B8860B` | Warnings (e.g. an `unverified_review` flag). |

### The video-hero overlay scrim

The single most important colour treatment on the site. A deep-green wash sits between the hero video and the text, guaranteeing legibility *and* delivering the boldest brand-green moment. Use a **gradient scrim**, not a flat block, so the video still breathes:

```css
/* left-to-right or bottom-heavy, tuned to where the text sits */
background: linear-gradient(
  105deg,
  rgba(14, 42, 28, 0.88) 0%,
  rgba(18, 61, 42, 0.66) 45%,
  rgba(18, 61, 42, 0.30) 100%
);
```

Text on the scrim: headline in `--paper`/white, supporting text in `--green-pale`. Never plain grey on the scrim.

> **Note on the greens:** these hexes are a starting system, tuned to feel modern and credible. If the school has an exact brand green (from a logo or letterhead), substitute it into `--green-brand`/`--green-signature` and re-derive the tints — but keep the *structure* (one anchor, one rationed action green, two tints).

---

## 3. Typography

A deliberate, non-generic pairing — a characterful display face used with restraint, a clean and highly readable body face, and a mono for data/reference codes. All free on Google Fonts, web-optimized, variable.

| Role | Face | Notes |
| --- | --- | --- |
| Display | **Bricolage Grotesque** | Headlines, hero, section titles. Modern, friendly, a touch of character — not the safe default. Used big and confident. |
| Body | **Hanken Grotesk** | Paragraphs, UI, most text. Clean, warm, excellent readability at all sizes. |
| Mono | **Geist Mono** | Reference numbers (e.g. `MGMT-2026-00042`), dates in data contexts, small technical labels. Optional but adds polish. |

> **Swap note:** this pairing is my pick to avoid a templated look. If you or the school prefer specific fonts, replace here — but keep the *display + body + mono* three-role structure and the scale below.

### Type scale (eye-catching — leans large)

Since the brief asks for attractive and eye-catching, the scale is generous. Display sizes use `clamp()` so they're bold on desktop and controlled on mobile.

| Token | Size (clamp) | Weight | Use |
| --- | --- | --- | --- |
| `--text-hero` | `clamp(2.5rem, 6vw, 4.5rem)` | 600 | Hero headline |
| `--text-h1` | `clamp(2rem, 4vw, 3rem)` | 600 | Page titles |
| `--text-h2` | `clamp(1.5rem, 3vw, 2.25rem)` | 600 | Section titles |
| `--text-h3` | `1.375rem` | 500 | Card titles, sub-sections |
| `--text-lead` | `1.25rem` | 400 | Intro/standfirst paragraphs |
| `--text-body` | `1.0625rem` | 400 | Default body (17px — slightly larger than default for warmth) |
| `--text-small` | `0.9375rem` | 400 | Captions, meta |
| `--text-eyebrow` | `0.8125rem` | 500 | Section eyebrows (letter-spacing `0.08em`, `--green-brand`, sentence case) |

Rules: line-height `1.15` for display, `1.65` for body. Sentence case everywhere — never Title Case, never ALL CAPS (eyebrows may use slight letter-spacing but stay sentence case). Two body weights only (400, 500/600 for emphasis).

---

## 4. Shape & Radii (rounded / soft)

Soft, friendly, modern — generous radii, no sharp corners.

| Token | Value | Use |
| --- | --- | --- |
| `--radius-sm` | `10px` | Buttons, inputs, badges |
| `--radius-md` | `16px` | Cards, image containers |
| `--radius-lg` | `24px` | Hero, large feature panels, section blocks |
| `--radius-full` | `999px` | Pills, avatars, eyebrow chips |

Rule: rounded corners only on full borders. No rounded corners on single-side accent borders.

---

## 5. Spacing

An 8px-based scale for rhythm. Sections breathe — vertical padding is generous on a marketing site.

| Token | Value |
| --- | --- |
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-12` | `48px` |
| `--space-16` | `64px` |
| `--space-24` | `96px` |

### Width, full-bleed & responsiveness

- **Content container width:** `min(1440px, 100%)`, centered, with fluid side padding `clamp(1rem, 5vw, 4rem)`. On a phone this is full width with a small (1rem) gutter; the padding grows smoothly as the screen widens; past ~1440px the content stops widening so text never runs uncomfortably long, while backgrounds keep filling the screen. Nothing snaps — it flows, which is what makes it work at any resolution.
- **Full-bleed elements** — the hero video, coloured section bands, the footer, and large image/gallery grids — span the full viewport width (`100vw`, no max-width, no side gaps). They break out of the content container.
- **The rhythm:** full-bleed *background*, comfortable-width *content* inside it. A section's coloured band or image reaches the screen edges; its text and cards sit within the `min(1440px, 100%)` measure with the clamp padding.
- **Readable measure:** never stretch a paragraph or a single line of body text edge-to-edge on a wide monitor — keep running text to roughly a 75-character measure. Full-bleed is for visuals and background bands, not running text.
- **Fluid grids:** card/tile sections use `repeat(auto-fit, minmax(280px, 1fr))` so they reflow automatically (e.g. 4-up desktop → 2-up tablet → 1-up mobile) without hand-written breakpoints for each — robust at resolutions never explicitly designed for.
- **Prefer fluid sizing:** reach for `clamp()`/viewport-based values over fixed per-breakpoint jumps throughout, so the layout scales smoothly at every width rather than only at the tested breakpoints.
- **Mobile is unaffected:** single column, full width with the 1rem gutter, mobile-first throughout.
- **Section vertical padding:** `clamp(64px, 10vw, 96px)`.

---

## 6. Motion (moderate — tasteful reveals & counters)

Animation is purposeful, never decorative. The moderate setting means: scroll reveals, stat counters, and hover life — no parallax, no elaborate page-load sequences.

| Pattern | Behaviour |
| --- | --- |
| Scroll reveal | Sections fade + rise `~16px` as they enter view, once. Stagger children slightly (`~60ms`). |
| Stat counters | Homepage numbers (years, students, teachers) count up when scrolled into view, once. |
| Hover | Cards lift subtly (`translateY(-2px)` + border darken to `--green-brand` tint). Buttons: background shift + slight scale on press. |
| Transitions | Duration `200–260ms`, easing `cubic-bezier(0.22, 1, 0.36, 1)` (a soft ease-out). |

**Reduced motion:** when `prefers-reduced-motion: reduce`, disable reveals and counters (show final state immediately) and replace the hero video with its poster image. This is mandatory, not optional.

---

## 7. The Video Hero (signature element)

The full-bleed hero video is the site's boldest moment. It must be *impressive and fast* — a heavy or janky video hero is worse than none. Build to these rules exactly:

**Playback:**
- `muted`, `autoplay`, `loop`, `playsinline`. Never any audio on autoplay.
- A **poster image** (a strong still frame) is set on the `<video>` so it displays *instantly* while the video loads — the hero is never blank.
- Encode a compressed web-optimized MP4 (H.264) plus a WebM if convenient. Keep the file lean (target a few MB, short loop of ~15–30s).

**Mobile & slow connections:**
- On small screens or when data-saver is detected, fall back to the poster image (still images cost far less and mobile autoplay is unreliable). The layout must look complete with *just the poster* — the video is an enhancement, not a dependency.

**Legibility:**
- The green gradient scrim (Section 2) sits over the video, under the text. Non-negotiable — plain text over raw video is unreadable.
- Headline in white/`--paper` (`--text-hero`), supporting line in `--green-pale`, then the primary CTA (`--green-signature` button) and a secondary ghost link.
- Stats row (years / students / teachers) sits below, on the scrim.

**Hosting (go-live decision):** don't serve a hero video off Cloudinary's free tier (quota) or as a raw repo asset if it's large. Options: a compressed file on the deploy, or a dedicated video host. Flag as a go-live item; a compressed local file is fine for building.

**Accessibility:** poster fallback for `prefers-reduced-motion`; the video is decorative so it needs no captions, but it must not be the only source of any information (the headline text carries the message).

**Structure sketch:**
```
[ full-bleed <video> with poster ]
[ green gradient scrim overlay    ]
   eyebrow: Admissions open for 2026 intake
   H-hero: Education for peace and prosperity, since 1993.
   lead:   A modern +2 and Bachelor's institution in Bhaktapur...
   [ Apply now → ]  ( Explore programmes )
   ── 30+ years ─── 1,200+ students ─── 60+ teachers ──
```

---

## 8. Core Components

**Buttons**
- *Primary:* `--green-signature` background, white text, `--radius-sm`, generous padding (`14px 26px`), weight 500. Hover: darken slightly + `scale(1.01)`; press: `scale(0.98)`. This is the rationed bright green — use one primary per view.
- *Secondary:* transparent with `--green-brand` border and text; on dark/scrim, `--paper` border and text (ghost).
- *Tertiary/link:* `--green-brand` text, underline on hover.

**Cards** — `--surface` background, `--radius-md`, `1px solid --line`, hover lifts and border shifts toward `--green-pale`. Image cards: image fills the top with `--radius-md` clipping, content padded below.

**Navigation** — clean top bar, `--paper`/transparent over the hero then solid on scroll. Logo left, links center/right, a persistent `Apply now` primary button far right (the CTA should always be reachable). Mobile: hamburger to a full-height sheet.

*Navigation sizing & scrim (tokens in `globals.css` `:root`):*

| Token | Value | Role |
| --- | --- | --- |
| `--nav-height` | `80px` | Bar height — taller so the larger links + logo breathe. |
| `--nav-logo-height` | `56px` | Visible logo height in the bar (logos delivered with Cloudinary `e_trim` so the mark fills it — no baked-in transparent padding). |
| `--nav-link-size` | `1.0625rem` (17px) | Nav link size, weight 500, in BOTH states. |
| `--nav-scrim-height` | `100px` | Height of the over-hero legibility scrim. |
| `--nav-scrim` | `linear-gradient(to bottom, rgba(0,0,0,0.30), rgba(0,0,0,0))` | Subtle top-down dark gradient behind the nav, **over-hero state only**, so white links stay legible over LIGHT parts of the hero video without reading as a solid bar. Removed in the solid/scrolled state (which has `--paper`). |

Over-hero links also carry a `text-shadow: 0 1px 3px rgba(0,0,0,0.4)` (the `.nav-legible` helper) on top of the scrim. All nav links are keyboard-focusable with the standard `--green-signature` focus ring, carry `aria-current` on the active page, and hover to an underline.

**Eyebrows** — small `--text-eyebrow` in `--green-brand` above section titles, sentence case, subtle letter-spacing. Use only where they encode something real (section topic), not as decoration.

**Badges/pills** — `--radius-full`, pale-green background with `--green-ink` text for neutral tags; semantic colours for status.

**Forms** — inputs at `--radius-sm`, `1px solid --line`, clear focus ring (`--green-signature` glow). Labels above fields, sentence case. Friendly, permissive validation; errors say what to fix in the interface's voice, never "Error:".

**Footer** — `--green-forest` background, `--green-pale` text, organized link columns, contact block, social. The calm bookend to the hero.

---

## 9. Imagery

- **Real photography leads.** Use the school's professional photos at generous sizes. Consistent treatment: natural, warm, not over-filtered.
- **Aspect ratios:** hero video/poster `16:9` (full-bleed); cards `4:3` or `3:2`; gallery preserves native with masonry option later.
- **Serve public images through Cloudinary's resizing transformation** (strips metadata, protects quota — PRD Decision 6). Never raw originals.
- **Green as frame, not filter:** where an image needs brand cohesion, frame it (rounded container, subtle green border, or a corner accent) rather than tinting the photo green.

---

## 10. Copy Voice

Warm, confident, plain. Sentence case. Active voice. Verb-first CTAs ("Apply now", "Explore programmes"). Name things by what the visitor recognizes. No corporate filler ("seamless", "empower", "unlock"), no exclamation marks on system text, no "click here". An empty state invites action; an error explains what to fix. Aspirational but never boastful — let the record (30 years, real students, real results) speak.

---

## 11. Accessibility Floor

Non-negotiable on every page: responsive to mobile; visible keyboard focus on all interactive elements; `prefers-reduced-motion` respected (no reveals/counters, poster instead of video); colour contrast meets WCAG AA (check white on the green scrim, and `--ink-muted` on `--paper`); all images have meaningful `alt` text; the hero message lives in real text, not only in the video.

---

## 12. Implementation Notes

- **Tailwind v4:** express these tokens as CSS custom properties in the global stylesheet's `@theme` block so they're available as utilities and in arbitrary values. Keep the token names above as the single source of truth.
- **Layout utilities (Section 5 width rules):** define one reusable content-container utility (max-width `min(1440px, 100%)` + `clamp(1rem, 5vw, 4rem)` side padding) and apply it to content; full-bleed sections omit it and set full viewport width. Standardize the "full-bleed band with contained inner content" wrapper (edge-to-edge background, inner container for text/cards) and the `repeat(auto-fit, minmax(280px, 1fr))` grid, so both patterns are applied consistently on every page rather than re-invented per page.
- **Fonts:** load Bricolage Grotesque, Hanken Grotesk, and Geist Mono via `next/font` (self-hosted, no layout shift, no external request at runtime) rather than a `<link>` — better performance and privacy.
- **One system, referenced everywhere:** every Phase 1+ build prompt names this doc and the `frontend-design` skill. Components derive their colour, type, radius, and spacing from these tokens — nothing hardcoded per page.
- **Dark mode:** not required for this build (a marketing site is fine light-only). If added later, derive from these tokens rather than retrofitting.

---

*This is a living document. As the design is tuned during the build ("more attractive as we go"), update the tokens and rules here so the whole site moves together rather than drifting.*