# Data Standard - Port Hero Media v1

Status: REVIEW
Owner: Data Architecture
Reviewers: Maritime Operations Expert, Legal and Compliance Reviewer, Frontend Architect, Performance Architect, QA Lead
Last updated: 2026-08-24

## Purpose

Define a source-safe, context-aware, bandwidth-first process for decorative port hero images without turning imagery into operational evidence.

## Scope

- Self-hosted hero media for the 30-port prototype rollout.
- Exact port and terminal-cluster matching.
- Source, creator, license, review state, local variants, checksums, and attribution.
- Standard-mode delivery with CSS fallback.

## Out of scope

- User uploads, image galleries, maps, backend storage, image moderation UI, and automatic production publishing.
- Hotlinking remote images at runtime.
- Images as evidence for gate, shore-leave, shuttle, taxi, price, safety, or current operating-status claims.

## Source priority

1. Wikimedia Commons files with reusable license metadata and a source page.
2. Openverse discovery only when the original source and license are independently verified.
3. Official port-authority or terminal-operator media only after written reuse permission is recorded.

Commercial vessel-tracking sites, search-engine thumbnails, social media, unknown licenses, non-commercial licenses, and no-derivatives licenses are blocked.

## Publication gate

An asset can enter the public manifest only when all conditions pass:

- Port identity is verified.
- Terminal or cluster identity is exact when the page shows a terminal-specific snapshot.
- Creator, source page, license name, and license URL are present.
- License metadata is verified for prototype reuse.
- Local files match expected dimensions, byte sizes, MIME type, and SHA-256 hashes.
- A visible source and license credit is rendered with the image.

Candidate discovery never publishes automatically. Ports without an approved asset keep the existing CSS background.

## Runtime contract

`PortMediaRepository` reads `/media/ports/manifest.json` and returns a `PortHeroMediaReadModel` only for an exact context match. The Port Hub remains a composed read model; media is not added as a persisted Port property.

Each published media record includes:

- Stable media ID.
- UN/LOCODE and accepted prototype port keys.
- Context slug and human-readable context label.
- Object-position hint for responsive display.
- Local responsive variants with width, height, byte size, MIME type, and SHA-256.
- Creator, provider, source page, license, capture date when known, and declared display changes.

## Bandwidth and failure behavior

- Standard mode may request the manifest and one responsive local image.
- Data Saver and Ultra Lite do not request the media manifest or image files.
- The snapshot has fixed layout before the image resolves, preventing layout shift.
- Manifest failure, missing context, image error, or integrity failure preserves the CSS fallback.
- No client image library, custom font, remote runtime request, or new dependency is required.

## Prototype release

The initial release publishes one exact Busan New Port asset:

- Source: [Pantos Logistics - Busan New Port Warehouse](https://commons.wikimedia.org/wiki/File:Pantos_Logistics_-_Busan_New_Port_Warehouse.jpg)
- Creator: Romlogistics
- License: [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)
- Local variants: 960px and 1280px JPEG

The remaining 29 rollout targets stay on the CSS fallback until the same gate is completed. The target order follows the [World Shipping Council 2024 container-port list](https://www.worldshipping.org/top-50-container-ports).

## Validation

Use:

```powershell
npm.cmd run data:media
npm.cmd run data:media:check
```

The normal `npm.cmd run check` gate also verifies committed media, manifest, attribution notice, and rollout coverage status.

## Open questions

- Legal and Compliance must approve the policy before the assets are treated as production-cleared.
- The next 29 images require individual context and license review; ranking alone does not authorize an image.

## Related files

- `scripts/port-media/port-media-sources.json`
- `public/media/ports/manifest.json`
- `public/media/ports/NOTICE.txt`
- `src/services/contracts/port-media-repository.ts`
