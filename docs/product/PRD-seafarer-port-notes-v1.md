# PRD — Seafarer Port Notes v1

Status: DRAFT baseline for product pivot  
Owner: Product / Architecture  
Created: 2026-08-18  
Applies to: MVP prototype after F3 dashboard review

## 1. Product pivot

The project remains a seafarer port knowledge product, but the primary user experience shifts from a dense **Port Hub dashboard** to a simpler **Seafarer Port Notes** experience.

New product statement:

> Seafarer Port Notes is a community-first place where seafarers save and share practical shore-leave knowledge for each port: eSIM/SIM, taxi and ride-hailing, shore leave, food/order, supplies, cheap stores, places worth visiting, and Seaman Club/Welfare information.

User-facing idea:

> Note lại cho mình và cho người sau.

The product is not a generic travel guide, social network, map app, booking app, or marketplace.

## 2. Primary users

MVP primary audience:

- Vietnamese seafarers.
- Mobile-first users with limited time and limited connectivity.
- Users who may be tired, busy, and unwilling to read a large dashboard.

Secondary future audiences:

- Chinese and international seafarers.
- Trusted contributors.
- Seafarers' Centers and welfare providers.
- Shipping agents and port-related partners.

## 3. Core user problem

When a vessel arrives at a port, seafarers need fast, practical answers:

- Can I go ashore?
- Which eSIM is cheap and actually works here?
- Is there a physical SIM seller near the port? How much is fair?
- Which gate should I use to get a taxi or ride-hailing car?
- What is a fair taxi/Grab/Uber/local-app price?
- How do I order food or supplies to the gate or near the terminal?
- Where can I buy cheap/good items?
- Are there nice places for photos or short visits?
- Is there a Seaman Club or Seafarers' Center? Does it have pickup, Wi-Fi, or return transport?
- What did other seafarers recently confirm?

The first screen must not force users to scan many equal-priority cards.

## 4. MVP value proposition

### For seafarers

- Find practical shore-leave tips quickly.
- Compare eSIM and SIM options by real usefulness, not just marketing price.
- Avoid being overcharged for taxi/transport/SIM.
- Save personal notes for future visits.
- Help the next crew by leaving a short structured note.

### For the product

- Community notes become the main data acquisition loop.
- Structured notes can later be converted into verified knowledge items.
- eSIM/SIM comparison becomes the strongest MVP hook.
- Trust and moderation remain core to avoid noisy social content.

## 5. MVP information hierarchy

### P0 — show near the top

1. Port Snapshot.
2. Best eSIM / Internet Deal.
3. Physical SIM Notes.
4. Taxi / Grab / Uber / Local Transport Notes.
5. Food / Order / Supplies Notes.
6. Top Notes from Seafarers.
7. Write a Note.

### P1 — accessible below or through topic sections

1. Places Worth Visiting.
2. Cheap Shopping / Good Stores.
3. Seaman Club / Welfare.
4. Shore Leave Details.
5. ATM / Currency.
6. Warnings / Scam Notes.

### P2 — defer

1. Full Shore Planner.
2. Full multi-port eSIM route optimizer.
3. Free-form Discussion Hub.
4. Partner Portal.
5. Marketplace, booking, payment.
6. Medical detail beyond emergency/contact logistics.

## 6. First-screen target

The first screen of a Port Notes page should answer:

```text
Busan New Port
Terminal: PNC

Shore leave: Reported allowed, confirm with agent
Best internet: Korea eSIM 5GB / 7 days / from USD 8.50
Taxi: Gate 2 is easiest exit; ask price first
Community: 312 notes, 48 recent confirmations

[Compare eSIM]
[Physical SIM Notes]
[Taxi / Grab / Uber]
[Food & Supplies]
[Places to Visit]
[Seaman Club]
[Write a Note]
```

This replaces the previous dashboard-first approach.

## 7. Primary actions

Primary buttons must be need-based, not domain-table based:

- Compare eSIM.
- Physical SIM Notes.
- Taxi / Grab / Uber.
- Food & Supplies.
- Places to Visit.
- Seaman Club.
- Write a Note.

Secondary actions:

- View all notes.
- Save port.
- Report wrong info.
- Emergency contacts.

## 8. Community model

Community is MVP core, but not an unstructured feed.

Use structured notes by topic:

- eSIM.
- Physical SIM.
- Taxi / Ride-hailing.
- Food / Order.
- Supplies / Shopping.
- Places to Visit.
- Seaman Club / Welfare.
- Shore Leave.
- Warning / Scam.
- General Tip.

Each topic gets a small form with only relevant fields. Do not use one generic review form for everything.

## 9. Public notes vs private notes

The product name includes "Notes", but there are two distinct modes:

### Public Port Note

- Shared with the community.
- Subject to moderation.
- Can be confirmed or marked useful by others.
- Must not expose private/sensitive data without consent.

### Private Note to Self

- Saved only for the user.
- Not visible to the community.
- Can include personal reminders such as "ask captain before going ashore".
- Must not be used as public knowledge unless the user explicitly submits it.

MVP can implement public notes first and keep private notes as UI placeholder if needed.

## 10. Trust and moderation rules

- Notes are not published as facts immediately.
- Notes can become community-confirmed after enough independent confirmations.
- Sensitive topics require stricter moderation: shore leave, documents, gate access, warnings, emergency, medical, welfare contacts, individual seller contacts.
- Do not expose raw timestamp as the main signal. Use trust/confidence status.
- Keep "confirmed by X seafarers" and "useful to X crew" visible when available.

## 11. Seller/contact rules

Physical SIM sellers, taxi contacts, food order contacts, and supply vendors are useful but high-risk.

Rules:

- Prefer public business contacts, shop names, or official pages.
- Do not publish a private person's phone number unless consent is documented or the number is clearly public business contact.
- Allow contact details to go through moderation.
- Mark unverified contact as "needs confirmation".
- Provide warning against advance payment or suspicious offers.

## 12. eSIM/SIM as MVP hook

The product should make eSIM/SIM comparison highly visible.

Minimum eSIM/SIM surface:

- Best eSIM for this port.
- Cheapest reasonable eSIM.
- Best hotspot option if data exists.
- Physical SIM notes near port.
- Signal quality at terminal if reported.
- Video call / WhatsApp call quality if reported.
- Review and advanced notes from seafarers.

Do not sell eSIM directly in MVP. Affiliate links can be deferred until trust and compliance are ready.

## 13. Out of scope for this pivot branch

Do not implement:

- Payment.
- Booking.
- Marketplace.
- Full social feed.
- Private chat.
- Map SDK.
- Heavy image gallery.
- Medical diagnosis or medicine advice.
- Unmoderated vendor listing.

## 14. Success criteria

A seafarer should be able to open a port page and within 30 seconds know:

- Whether shore leave is likely possible.
- The best Internet/eSIM option.
- Where to find SIM/taxi/food/supplies notes.
- The most useful community notes.
- How to contribute one useful note.

A first-time contributor should be able to choose a topic and submit a short note in under two minutes.
