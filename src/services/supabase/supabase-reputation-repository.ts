import { resolveUserRank } from "../../features/user-rank/user-rank";
import { DEFAULT_XP_RULES } from "../../features/reputation/xp-rules";
import type {
  ConfirmationResult,
  AdminXpLedgerPage,
  CorrectionQueueItem,
  CorrectionReviewAction,
  EvidencePurpose,
  ReputationActionInput,
  ReputationActionPreview,
  NoteCorrectionSubmission,
  VerifiedConfirmationSubmission,
  XpEventReadModel,
  XpEventType,
  XpHistoryFilter,
  XpHistoryPage,
  XpRuleReadModel,
  XpSummaryReadModel,
  XpSystemStatus,
  XpLaunchResult,
} from "../../types";
import type { ReputationRepository } from "../contracts/reputation-repository";
import type { RequestOptions } from "../contracts/request-context";
import { ServiceError } from "../service-errors";
import { getSupabaseClient, hasSupabaseConfig } from "./supabase-client";

function recordOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function checkAbort(options?: RequestOptions): void {
  if (options?.signal?.aborted) throw new DOMException("The request was aborted.", "AbortError");
}

export function mapXpEvent(value: unknown): XpEventReadModel {
  const row = recordOf(value);
  return {
    id: typeof row.id === "string" ? row.id : "",
    eventType: (typeof row.event_type === "string" ? row.event_type : "administrative_correction") as XpEventType,
    sourceType: typeof row.source_type === "string" ? row.source_type : "system",
    sourceId: typeof row.source_id === "string" ? row.source_id : "",
    amount: Number(row.amount ?? 0),
    reasonCode: typeof row.reason_code === "string" ? row.reason_code : undefined,
    reasonText: typeof row.reason_text === "string" ? row.reason_text : undefined,
    metadata: recordOf(row.metadata),
    createdAt: typeof row.created_at === "string" ? row.created_at : "",
  };
}

export function mapXpSystemStatus(value: unknown): XpSystemStatus {
  const row = recordOf(value);
  return { launchAt: typeof row.launch_at === "string" ? row.launch_at : undefined };
}

export function mapXpLaunchResult(value: unknown): XpLaunchResult {
  const row = recordOf(value);
  return {
    launchAt: typeof row.launch_at === "string" ? row.launch_at : "",
    alreadyLaunched: row.already_launched === true,
    notes: Number(row.notes ?? 0),
    communityConfirmed: Number(row.community_confirmed ?? 0),
    foundingContributors: Number(row.founding_contributors ?? 0),
  };
}

function mapRule(value: unknown): XpRuleReadModel | undefined {
  const row = recordOf(value);
  const eventType = row.event_type;
  if (eventType !== "approved_note" && eventType !== "community_confirmed" && eventType !== "accepted_correction" && eventType !== "verified_confirmation") return undefined;
  return {
    eventType,
    amount: Number(row.amount ?? 0),
    rewardedLimit: row.rewarded_limit == null ? undefined : Number(row.rewarded_limit),
    windowHours: row.window_hours == null ? undefined : Number(row.window_hours),
  };
}

export class UnavailableReputationRepository implements ReputationRepository {
  isConfigured(): boolean { return false; }
  async getMySummary(): Promise<XpSummaryReadModel> {
    return { rank: resolveUserRank(0), recent: [], rules: DEFAULT_XP_RULES };
  }
  async listMyEvents(): Promise<XpHistoryPage> { return { items: [] }; }
  async getMyEvent(): Promise<XpEventReadModel> { throw new ServiceError("auth-required", "Sign-in is required."); }
  async confirmNote(): Promise<ConfirmationResult> { throw new ServiceError("notes-not-configured", "Reputation is not configured."); }
  async submitCorrection(): Promise<void> { throw new ServiceError("notes-not-configured", "Reputation is not configured."); }
  async listCorrections(): Promise<readonly CorrectionQueueItem[]> { return []; }
  async reviewCorrection(): Promise<void> { throw new ServiceError("notes-not-configured", "Reputation is not configured."); }
  async listAdminLedger(): Promise<AdminXpLedgerPage> { return { items: [] }; }
  async getSystemStatus(): Promise<XpSystemStatus> { throw new ServiceError("auth-required", "Admin access is required."); }
  async launchSystem(): Promise<XpLaunchResult> { throw new ServiceError("auth-required", "Admin access is required."); }
  async previewReputationAction(): Promise<ReputationActionPreview> { throw new ServiceError("auth-required", "Admin access is required."); }
  async applyReputationAction(): Promise<void> { throw new ServiceError("auth-required", "Admin access is required."); }
  async uploadEvidence(): Promise<string> { throw new ServiceError("notes-not-configured", "Evidence upload is not configured."); }
  async getEvidenceUrl(): Promise<string> { throw new ServiceError("auth-required", "Staff access is required."); }
}

export class SupabaseReputationRepository implements ReputationRepository {
  isConfigured(): boolean { return hasSupabaseConfig(); }

  async getMySummary(options?: RequestOptions): Promise<XpSummaryReadModel> {
    checkAbort(options);
    const client = await getSupabaseClient();
    if (!client) throw new ServiceError("auth-not-configured", "Supabase is not configured.");
    const { data, error } = await client.rpc("get_my_xp_summary");
    if (error) throw error;
    const row = recordOf(data);
    const rank = recordOf(row.rank);
    const rules = Array.isArray(row.rules) ? row.rules.map(mapRule).filter((item): item is XpRuleReadModel => Boolean(item)) : DEFAULT_XP_RULES;
    return {
      rank: resolveUserRank(Number(rank.xp ?? 0)),
      recent: Array.isArray(row.recent) ? row.recent.map(mapXpEvent) : [],
      rules,
    };
  }

  async listMyEvents(filter: XpHistoryFilter, cursor?: string, options?: RequestOptions): Promise<XpHistoryPage> {
    checkAbort(options);
    const client = await getSupabaseClient();
    if (!client) return { items: [] };
    const { data, error } = await client.rpc("list_my_xp_events", { p_filter: filter, p_cursor: cursor ?? null, p_limit: 25 });
    if (error) throw error;
    const row = recordOf(data);
    return {
      items: Array.isArray(row.items) ? row.items.map(mapXpEvent) : [],
      nextCursor: typeof row.next_cursor === "string" ? row.next_cursor : undefined,
    };
  }

  async getMyEvent(eventId: string, options?: RequestOptions): Promise<XpEventReadModel> {
    checkAbort(options);
    const client = await getSupabaseClient();
    if (!client) throw new ServiceError("auth-not-configured", "Supabase is not configured.");
    const { data, error } = await client.rpc("get_my_xp_event", { p_event_id: eventId });
    if (error) throw error;
    return mapXpEvent(data);
  }

  async confirmNote(submission: VerifiedConfirmationSubmission): Promise<ConfirmationResult> {
    const client = await getSupabaseClient();
    if (!client) throw new ServiceError("notes-not-configured", "Reputation is not configured.");
    const { data, error } = await client.rpc("submit_verified_confirmation", {
      p_note_id: submission.noteId,
      p_source: submission.source,
      p_verification_period: submission.verificationPeriod,
      p_comment: submission.comment ?? null,
      p_idempotency_key: submission.idempotencyKey,
      p_evidence_path: submission.evidencePath ?? null,
    });
    if (error) throw error;
    const row = recordOf(data);
    return { rewardedXp: Number(row.rewarded_xp ?? 0), communityConfirmationCount: Number(row.community_confirmation_count ?? 0) };
  }

  async submitCorrection(submission: NoteCorrectionSubmission): Promise<void> {
    const client = await getSupabaseClient();
    if (!client) throw new ServiceError("notes-not-configured", "Reputation is not configured.");
    const rpcName = submission.sourceFeedbackId ? "submit_note_correction_from_feedback" : "submit_note_correction";
    const { error } = await client.rpc(rpcName, {
      ...(submission.sourceFeedbackId
        ? { p_feedback_id: submission.sourceFeedbackId }
        : { p_note_id: submission.noteId }),
      p_action: submission.action,
      p_field_type: submission.fieldType,
      p_current_information: submission.currentInformation,
      p_proposed_information: submission.proposedInformation,
      p_verification_period: submission.verificationPeriod,
      p_note: submission.note ?? null,
      p_evidence_path: submission.evidencePath ?? null,
      p_idempotency_key: submission.idempotencyKey,
    });
    if (error) throw error;
  }

  async listCorrections(status: "pending" | "accepted" | "rejected" = "pending"): Promise<readonly CorrectionQueueItem[]> {
    const client = await getSupabaseClient();
    if (!client) return [];
    const { data, error } = await client.rpc("list_correction_queue", { p_status: status });
    if (error) throw error;
    return Array.isArray(data) ? data.map((value) => {
      const row = recordOf(value);
      return {
        id: String(row.id ?? ""), noteId: String(row.note_id ?? ""),
        action: row.action as CorrectionQueueItem["action"], fieldType: row.field_type as CorrectionQueueItem["fieldType"],
        currentInformation: String(row.current_information ?? ""), proposedInformation: String(row.proposed_information ?? ""),
        verificationPeriod: row.verification_period as CorrectionQueueItem["verificationPeriod"],
        note: typeof row.note === "string" ? row.note : undefined,
        evidencePath: typeof row.evidence_path === "string" ? row.evidence_path : undefined,
        status: row.status as CorrectionQueueItem["status"], impact: row.impact as CorrectionQueueItem["impact"],
        createdAt: String(row.created_at ?? ""), noteSummary: String(row.note_summary ?? ""),
        portKey: String(row.port_key ?? ""), submitterAlias: String(row.submitter_alias ?? ""),
      };
    }) : [];
  }

  async reviewCorrection(action: CorrectionReviewAction): Promise<void> {
    const client = await getSupabaseClient();
    if (!client) throw new ServiceError("notes-not-configured", "Reputation is not configured.");
    const { error } = await client.rpc("review_note_correction", {
      p_correction_id: action.correctionId, p_decision: action.decision,
      p_impact: action.impact ?? null, p_reason: action.reason ?? null,
      p_idempotency_key: action.idempotencyKey,
    });
    if (error) throw error;
  }

  async listAdminLedger(userId?: string, cursor?: string): Promise<AdminXpLedgerPage> {
    const client = await getSupabaseClient();
    if (!client) return { items: [] };
    const { data, error } = await client.rpc("list_admin_xp_ledger", { p_user_id: userId ?? null, p_cursor: cursor ?? null, p_limit: 50 });
    if (error) throw error;
    const row = recordOf(data);
    return {
      items: Array.isArray(row.items) ? row.items.map((value) => {
        const raw = recordOf(value);
        return { ...mapXpEvent(raw), userId: String(raw.user_id ?? ""), userLabel: String(raw.user_label ?? "CrewPort"), currentXp: Number(raw.current_xp ?? 0) };
      }) : [],
      nextCursor: typeof row.next_cursor === "string" ? row.next_cursor : undefined,
    };
  }

  async getSystemStatus(): Promise<XpSystemStatus> {
    const client = await getSupabaseClient();
    if (!client) throw new ServiceError("auth-required", "Admin access is required.");
    const { data, error } = await client.rpc("get_xp_system_status");
    if (error) throw error;
    return mapXpSystemStatus(data);
  }

  async launchSystem(): Promise<XpLaunchResult> {
    const client = await getSupabaseClient();
    if (!client) throw new ServiceError("auth-required", "Admin access is required.");
    const { data, error } = await client.rpc("launch_xp_system");
    if (error) throw error;
    return mapXpLaunchResult(data);
  }

  async previewReputationAction(input: Omit<ReputationActionInput, "reason" | "idempotencyKey">): Promise<ReputationActionPreview> {
    const client = await getSupabaseClient();
    if (!client) throw new ServiceError("auth-required", "Staff access is required.");
    const { data, error } = await client.rpc("preview_reputation_action", { p_user_id: input.userId, p_action: input.action, p_source_type: input.sourceType, p_source_id: input.sourceId });
    if (error) throw error;
    const row = recordOf(data);
    return { currentXp: Number(row.current_xp ?? 0), reversalXp: Number(row.reversal_xp ?? 0), penaltyXp: Number(row.penalty_xp ?? 0), afterXp: Number(row.after_xp ?? 0) };
  }

  async applyReputationAction(input: ReputationActionInput): Promise<void> {
    const client = await getSupabaseClient();
    if (!client) throw new ServiceError("auth-required", "Staff access is required.");
    const { error } = await client.rpc("apply_reputation_action", { p_user_id: input.userId, p_action: input.action, p_source_type: input.sourceType, p_source_id: input.sourceId, p_reason: input.reason, p_idempotency_key: input.idempotencyKey });
    if (error) throw error;
  }

  async uploadEvidence(file: File, purpose: EvidencePurpose): Promise<string> {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      throw new ServiceError("invalid-evidence", "Evidence must be a JPEG, PNG or WebP image up to 5 MB.");
    }
    const client = await getSupabaseClient();
    if (!client) throw new ServiceError("notes-not-configured", "Evidence upload is not configured.");
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) throw userError ?? new ServiceError("auth-required", "Sign-in is required.");
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const id = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const path = `${userData.user.id}/${purpose}/${id}.${extension}`;
    const { error } = await client.storage.from("note-evidence").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return path;
  }

  async getEvidenceUrl(path: string): Promise<string> {
    const client = await getSupabaseClient();
    if (!client) throw new ServiceError("auth-required", "Staff access is required.");
    const { data, error } = await client.storage.from("note-evidence").createSignedUrl(path, 300);
    if (error) throw error;
    return data.signedUrl;
  }
}
