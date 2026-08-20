import type {
  ConnectivityProduct,
  Country,
  EmergencyContact,
  EntityId,
  Place,
  PortNote,
  Review,
  TerminalPlaceAccess,
  WelfareProvider,
  WelfareService,
} from "./entities";
import type {
  DataStatusTag,
  KnowledgeMeta,
  MoneyObservation,
  TrustEvidence,
} from "./knowledge-meta";

export interface TerminalSummary {
  readonly id: EntityId;
  readonly slug: string;
  readonly name: string;
  readonly gateNames: readonly string[];
}

export interface PortSummary {
  readonly id: EntityId;
  readonly slug: string;
  readonly name: string;
  readonly country: Country;
  readonly city?: string;
  readonly unLocode?: string;
  readonly terminalNames: readonly string[];
  readonly aliases: readonly string[];
  readonly trust: TrustEvidence;
}

export type CriticalInformationSeverity = "info" | "warning" | "critical";

export interface CriticalInformation {
  readonly id: string;
  readonly severity: CriticalInformationSeverity;
  readonly title: string;
  readonly summary: string;
  readonly meta: KnowledgeMeta;
}

export interface KnowledgeBlock {
  readonly id: string;
  readonly label: string;
  readonly summary: string;
  readonly details: readonly string[];
  readonly meta: KnowledgeMeta;
}

export interface QuickBriefItem {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly emphasis: "normal" | "positive" | "caution";
  readonly meta: KnowledgeMeta;
}

export interface PortOverviewReadModel {
  readonly decisionSummary: string;
  readonly weatherPlaceholder?: string;
  readonly items: readonly KnowledgeBlock[];
}

export interface PortAccessReadModel {
  readonly shoreLeave: KnowledgeBlock;
  readonly requiredDocuments: KnowledgeBlock;
  readonly terminalAccess: KnowledgeBlock;
  readonly transport: readonly KnowledgeBlock[];
  readonly returnToShip: KnowledgeBlock;
}

export interface PortInternetReadModel {
  readonly bestOption: KnowledgeBlock;
  readonly mobileOperators: readonly KnowledgeBlock[];
  readonly esimProducts: readonly ConnectivityProduct[];
  readonly physicalSim: readonly KnowledgeBlock[];
  readonly wifi: readonly KnowledgeBlock[];
}

export type ServiceScopeWarning =
  | "port-scoped-only"
  | "needs-terminal-confirmation"
  | "remote-service-no-physical-place";

export interface PlaceRecommendation {
  readonly place: Place;
  readonly reasonCodes: readonly string[];
  readonly access?: TerminalPlaceAccess;
  readonly scopeWarning?: ServiceScopeWarning;
  readonly statusTags: readonly DataStatusTag[];
  readonly estimatedCost?: readonly MoneyObservation[];
}

export interface ServiceCategoryReadModel {
  readonly id: string;
  readonly label: string;
  /** Already ranked for this terminal/context; Port Hub displays at most three. */
  readonly recommendations: readonly PlaceRecommendation[];
  readonly totalAvailable: number;
}

export interface PortServicesReadModel {
  readonly categories: readonly ServiceCategoryReadModel[];
}

export interface PortCommunityReadModel {
  readonly reviews: readonly Review[];
  readonly notes: readonly PortNote[];
  readonly openConfirmationCount: number;
  readonly contributionPrompt: string;
}

export interface DataHealthReadModel {
  readonly coverage: "complete" | "partial" | "limited";
  readonly missingAreas: readonly string[];
  readonly conflictingAreas: readonly string[];
  readonly trust: TrustEvidence;
}

/**
 * UI-oriented terminal/berth grouping assembled by the Port Notes read model.
 * It is not a persisted domain entity and every operational claim keeps its
 * own KnowledgeMeta/trust evidence.
 */
export interface PortNotesContextReadModel {
  readonly id: string;
  readonly slug: string;
  readonly label: string;
  readonly displayName: string;
  readonly terminalLabel: string;
  readonly gateName: string;
  readonly terminalId?: EntityId;
  readonly shoreLeave: KnowledgeBlock;
  readonly taxiPickup: KnowledgeBlock;
  readonly quickNotes: readonly KnowledgeBlock[];
  readonly criticalInformation: readonly CriticalInformation[];
  readonly noteIds: readonly EntityId[];
  readonly welfareProviderIds: readonly EntityId[];
  readonly taxiHangulPhrase: string;
}

export interface PortHubReadModel {
  readonly port: PortSummary;
  readonly terminals: readonly TerminalSummary[];
  readonly selectedTerminalId?: EntityId;
  readonly criticalInformation: readonly CriticalInformation[];
  readonly quickBrief: readonly QuickBriefItem[];
  readonly overview: PortOverviewReadModel;
  readonly access: PortAccessReadModel;
  readonly internet: PortInternetReadModel;
  readonly services: PortServicesReadModel;
  readonly emergencyContacts: readonly EmergencyContact[];
  readonly welfareProviders: readonly WelfareProvider[];
  readonly welfareServices: readonly WelfareService[];
  readonly community: PortCommunityReadModel;
  readonly dataHealth: DataHealthReadModel;
  readonly portNotesContexts?: readonly PortNotesContextReadModel[];
  readonly selectedPortNotesContextId?: string;
}

export interface PlannerInput {
  readonly portId: EntityId;
  readonly terminalId: EntityId;
  readonly shoreLeaveStartsAt: string;
  readonly mustReturnBy: string;
  readonly budget?: number;
  readonly currency: string;
  readonly partySize: number;
  readonly maximumWalkingMinutes: number;
  readonly needs: readonly (
    | "cash"
    | "shopping"
    | "food"
    | "medical"
    | "welfare"
  )[];
}

export interface PlannerTimelineStep {
  readonly id: string;
  readonly title: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly placeId?: EntityId;
  readonly reasonCodes: readonly string[];
}

export interface PlannerResult {
  readonly feasible: boolean;
  readonly timeline: readonly PlannerTimelineStep[];
  readonly totalMinutes: number;
  readonly returnBufferMinutes: number;
  readonly estimatedCost: readonly MoneyObservation[];
  readonly warnings: readonly string[];
  readonly reasonCodes: readonly string[];
  readonly returnToShip: KnowledgeBlock;
}

export interface ConnectivityCompareInput {
  readonly portIds: readonly EntityId[];
  readonly dataNeedGb: number;
  readonly validityDays: number;
  readonly hotspotRequired: boolean;
  readonly budget?: number;
  readonly currency: string;
}

export type ConnectivityRecommendationStrategy =
  | "cheapest"
  | "simplest"
  | "bestCoverage";

export interface ConnectivityRecommendation {
  readonly strategy: ConnectivityRecommendationStrategy;
  readonly products: readonly ConnectivityProduct[];
  readonly totalPrice: readonly MoneyObservation[];
  readonly installationCount: number;
  readonly uncoveredPortIds: readonly EntityId[];
  readonly reasonCodes: readonly string[];
}

export interface ConnectivityCompareResult {
  readonly recommendations: readonly ConnectivityRecommendation[];
}
