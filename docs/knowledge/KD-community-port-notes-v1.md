# Knowledge Dictionary — Community Port Notes v1

Status: DRAFT baseline for community-first MVP  
Owner: Product / Data / Community / Moderation  
Created: 2026-08-18

## 1. Purpose

Community Port Notes turns seafarer experience into structured, searchable, trust-aware knowledge.

It is not a free-form social feed. It is a system for collecting short, useful, moderated notes by port, terminal, gate, topic, and trust state.

Core purpose:

> Let seafarers note useful information for themselves and for the next crew.

## 2. Core entity: PortNote

Suggested type:

```ts
export type NoteTopic =
  | "esim"
  | "physicalSim"
  | "taxi"
  | "rideHailing"
  | "foodOrder"
  | "supplies"
  | "shopping"
  | "placesToVisit"
  | "seamanClub"
  | "shoreLeave"
  | "warning"
  | "generalTip";

export type NoteVisibility = "public" | "private";

export interface PortNote {
  readonly id: EntityId;
  readonly portId: EntityId;
  readonly terminalId?: EntityId;
  readonly gateName?: string;
  readonly topic: NoteTopic;
  readonly visibility: NoteVisibility;
  readonly title: string;
  readonly summary: string;
  readonly payload: PortNotePayload;
  readonly publicAlias?: string;
  readonly moderationState: ReviewModerationState;
  readonly confirmationCount: number;
  readonly usefulnessCount: number;
  readonly createdAt: IsoDateTime;
  readonly trust: TrustEvidence;
}
```

## 3. Topic payloads

Use topic-specific payloads. Do not use one generic JSON bag for all notes without validation.

### 3.1 eSIM Note

Fields:

```text
providerName
planName
priceAmount
priceCurrency
dataGb
validityDays
hotspotWorked
terminalSignalQuality
videoCallQuality
activationDifficulty
wouldRecommend
comment
```

UI questions:

- Which eSIM did you use?
- How much did you pay?
- How many GB / how many days?
- Did hotspot work?
- Was signal good at terminal/cabin/gate?
- Was video call usable?
- Would you recommend it?

### 3.2 Physical SIM Note

Fields:

```text
sellerNameOrLocation
sellerContact
contactIsPublicBusiness
priceAmount
priceCurrency
dataOrPlanDescription
passportRequired
activationHelpAvailable
whereToBuy
howToContact
wouldRecommend
comment
```

Moderation:

- Seller contact must be checked.
- Private personal phone numbers require consent or must be hidden.
- Public shop/business contacts can be shown with source/trust status.

### 3.3 Taxi / Transport Note

Fields:

```text
fromTerminalId
fromGateName
toAreaOrPlace
transportType
appName
fareAmount
fareCurrency
priceAgreedBeforeRide
receiptAvailable
scamWarning
wouldRecommend
comment
```

UI questions:

- From which gate did you leave?
- Where did you go?
- Taxi / Grab / Uber / local app / bus?
- How much did you pay?
- Did you agree the price before riding?
- Any warning?

### 3.4 Food / Order Note

Fields:

```text
orderMethod
appOrWebsite
contactOrShopName
pickupPoint
deliveryToGateAllowed
paymentMethod
priceRange
recommendedItems
languageIssue
wouldRecommend
comment
```

### 3.5 Supplies / Shopping Note

Fields:

```text
placeName
category
addressOrArea
itemsAvailable
priceLevel
internationalCardWorked
howToGo
estimatedTransportFare
wouldRecommend
comment
```

### 3.6 Places to Visit Note

Fields:

```text
placeName
category
addressOrArea
whyVisit
photoSpot
estimatedTimeNeeded
howToGo
estimatedFare
safeForShortShoreLeave
wouldRecommend
comment
```

### 3.7 Seaman Club / Welfare Note

Fields:

```text
providerName
pickupAvailable
returnTransportAvailable
wifiQuality
servicesUsed
contactMethod
openHoursObserved
costOrDonation
wouldRecommend
comment
```

### 3.8 Shore Leave Note

Fields:

```text
shoreLeaveAllowed
requiredDocuments
agentConfirmationNeeded
gateUsed
securityProcess
returnProcess
warning
comment
```

High moderation level. Do not auto-publish as verified fact.

### 3.9 Warning / Scam Note

Fields:

```text
warningType
affectedArea
description
moneyAmount
currency
howToAvoid
severity
comment
```

High moderation level. Quarantine before public display if it names a person/business or alleges fraud.

## 4. Confirmation model

Suggested type:

```ts
export interface NoteConfirmation {
  readonly id: EntityId;
  readonly noteId: EntityId;
  readonly userId: EntityId;
  readonly value: "confirmed" | "changed" | "notSure" | "useful";
  readonly terminalId?: EntityId;
  readonly createdAt: IsoDateTime;
}
```

Display examples:

```text
Confirmed by 18 seafarers
Useful to 24 crew
Needs confirmation
Conflicting reports
```

Do not display raw timestamps as the primary trust signal.

## 5. Ranking rules

Default Top Notes ranking:

1. Safety or high-utility warning if verified.
2. eSIM/SIM notes with strong usefulness.
3. Taxi/transport price notes.
4. Food/order/supplies notes.
5. Places worth visiting.
6. Seaman Club/Welfare notes.
7. Recent useful general tips.

Ranking factors:

- Topic priority.
- Confirmation count.
- Usefulness count.
- Terminal/gate specificity.
- Moderation state.
- Conflict state.
- Recency as secondary factor.

## 6. Trust states

Use existing TrustEvidence + DataStatusTag. Add note-specific tags later if needed:

```text
note-community-confirmed
note-needs-confirmation
note-conflicting-reports
seller-contact-needs-review
price-observed
terminal-specific
```

## 7. Moderation rules

Auto-publish should be conservative.

Low-risk examples:

- "CU near gate sells ready meals."
- "eSIM worked for WhatsApp calls near gate."

Needs moderation:

- Seller phone/contact.
- Accusation of scam.
- Shore leave rules.
- Gate/security procedure changes.
- Emergency/welfare contacts.
- Medical-related claims.

Quarantine:

- Personal data.
- Passport/ID/photo of documents.
- Harassment or naming private individuals.
- Fraud allegation without enough context.
- Illegal service or suspicious payment request.

## 8. UI surfaces

### Port Snapshot

Use aggregated note facts.

### Best Internet Deal

Use eSIM notes and connectivity products.

### Top Notes

Use ranked notes.

### Topic pages

Each topic can have its own list and structured contribution form.

### Write Note flow

Steps:

1. Choose topic.
2. Choose port/terminal/gate.
3. Fill short topic-specific form.
4. Preview note.
5. Submit to moderation.

## 9. Out of scope

- Full chat.
- Private messaging.
- Unmoderated public feed.
- Marketplace.
- Booking/payment.
- Guaranteeing seller legitimacy.
- AI-generated factual claims without user/source evidence.

## 10. Acceptance criteria

- Notes can be structured by topic.
- Notes can be attached to port, terminal, and gate.
- Notes can be confirmed or marked useful.
- Notes can feed Top Notes on the Port Notes page.
- Seller/contact notes have moderation controls.
- The model can support public notes and future private notes-to-self.
