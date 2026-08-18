# UI Brief — Seafarer Port Notes v1

Status: DRAFT baseline for F3 refactor  
Owner: Product / UX / Frontend  
Created: 2026-08-18

## 1. Goal

Refactor the current Port Hub visual prototype into a simpler, community-first **Seafarer Port Notes** interface.

The new UI should be visually polished but much less dense. It must feel like a practical crew note board, not an enterprise operations dashboard.

Primary UX sentence:

> Open a port, see the useful notes first, then choose what you need: eSIM, SIM, taxi, food, places, Seaman Club, or write a note.

## 2. Design principles

1. Mobile first.
2. Text first.
3. Notes first.
4. eSIM/SIM first among service topics.
5. Show fewer items initially.
6. Make contribution obvious.
7. Keep trust visible without overwhelming users.
8. No map embed by default.
9. No premium upsell in MVP.
10. No star rating as primary community metric.

## 3. Page structure

Recommended route remains:

```text
/ports/:portSlug
```

The route should render Port Notes, not a dense dashboard.

### Top-level structure

```text
PortNotesPage
├── App/sidebar or compact nav
├── Top search
├── PortSnapshot
├── BestInternetDeal
├── MainActionTiles
├── TopSeafarerNotes
├── TopicPreviewSections
├── DataTrustBanner
└── Emergency/Return shortcuts as compact secondary elements
```

## 4. Desktop layout

Desktop can keep a left sidebar, but it must not dominate the experience.

Suggested desktop grid:

```text
left nav: 220px
main content: max 960-1080px
right rail: optional, only for Quick Port Notes or compact map/address placeholder
```

Avoid the previous layout where many cards compete equally.

## 5. Mobile layout

Mobile is the primary target.

Rules:

- No fixed desktop sidebar.
- Single-column content.
- Sticky or compact top search.
- Main action tiles can scroll horizontally or wrap in a 2-column grid.
- Top notes must appear before deep service cards.
- Return/Emergency shortcuts should be compact and always discoverable.

## 6. Header: Port Snapshot

Replace dashboard header with a concise snapshot.

Content:

```text
Busan New Port
Busan, South Korea
Terminal: PNC – Pier North Container Terminal

Shore leave: Reported allowed, confirm with agent
Best internet: Korea eSIM 5GB / 7 days / from USD 8.50
Taxi: Gate 2 is easiest exit; ask price first
Community: 312 notes, 48 recent confirmations
```

Use trust chips, but do not display many badges. Maximum 3 chips:

- Shore leave status.
- Community notes count.
- Confidence.

## 7. Best Internet Deal

This is the main MVP hook.

Card content:

```text
Best Internet Deal
Korea eSIM 5GB / 7 days
From USD 8.50
Hotspot: reported working
Video call: usable near gate, weaker below deck
Confirmed/useful by: X seafarers

[Compare eSIM]
[Read eSIM notes]
[Add eSIM note]
```

Rules:

- Do not sell eSIM directly in MVP.
- Do not present provider marketing claims as facts.
- Show whether hotspot/signal/video call are provider data, community data, or unknown.

## 8. Main Action Tiles

Use need-based tiles:

```text
Compare eSIM
Physical SIM Notes
Taxi / Grab / Uber
Food & Supplies
Places to Visit
Seaman Club
Write a Note
```

Each tile should have:

- Short label.
- Icon or simple symbol.
- Optional count/status.
- Clear tap target.

Do not show every domain at once.

## 9. Top Notes from Seafarers

This section is the core of the new product.

Show 3 to 5 notes initially.

Card format:

```text
[Topic tag]
Short note text, max 2-3 lines.
Confirmed by 18 seafarers / Useful to 24 crew
Terminal/gate tag if known
[View thread] [Confirm]
```

Examples:

```text
Transport
Taxi from Gate 2 to Nampo usually 10,000-12,000 KRW. Ask price first.
Confirmed by 18 seafarers.
```

```text
Internet
Korea eSIM 5GB works well for WhatsApp calls; signal weaker below deck.
Useful to 24 crew.
```

```text
Supplies
CU near the gate sells ready meals and accepts international cards.
Confirmed by 16 seafarers.
```

No star rating.

## 10. Topic Preview Sections

Below top notes, show compact topic sections:

- Internet & SIM.
- Shore Leave & Transport.
- Food / Order / Supplies.
- Places Worth Visiting.
- Seaman Club / Welfare.
- Need More Help?

Each section should show 3 short bullets and one action.

Example:

```text
Internet & SIM
- Top eSIM: Korea eSIM 5GB / 7 days / from USD 8.50
- Physical SIM: SK Telecom booth near arrival hall
- Wi-Fi: Seafarers' Center and major cafes
[See all eSIM deals]
```

## 11. Map and address

Map should not be embedded by default.

Allowed:

- CSS placeholder map card.
- "Open in Maps" link/button.
- Copy address.

Do not add map SDK.

## 12. Emergency and Return to Ship

Do not make a large countdown panel unless the user has entered a shore leave plan.

Default compact elements:

- Emergency shortcut.
- Return info placeholder.
- Gate/address reminder.

Return to Ship detail belongs to Shore Planner / Return Card flow.

## 13. Data Saver and Ultra Lite

Data Saver:

- Hide decorative image.
- Keep notes and action tiles.
- No large shadows or media.

Ultra Lite:

- Text-first.
- Single column.
- Hide decorative icons if needed.
- Keep Port Snapshot, Best Internet Deal, Top Notes, and Write Note action.

## 14. Visual tone

Use:

- Maritime blue for identity and actions.
- Green for useful/confirmed notes.
- Orange for caution/pricing/transport.
- Red only for real warning/emergency.
- Soft card borders and whitespace.

Avoid:

- Enterprise dashboard density.
- Too many equal cards.
- Premium/paid upsell.
- Star rating.
- Heavy illustration.

## 15. Acceptance criteria

The UI is acceptable when:

- A busy seafarer can understand the port in 30 seconds.
- Best eSIM/Internet option is visible near the top.
- Top community notes are visible before deep service grids.
- Write a Note is obvious.
- Taxi, physical SIM, food/supplies, places, and Seaman Club are accessible from first screen.
- The page still respects Trust First, Bandwidth First, and terminal/gate-aware data.
- It works on mobile without horizontal overflow.
