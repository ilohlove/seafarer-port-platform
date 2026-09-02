import type {
  AccuracyAnswer,
  ModerationAction,
  ModerationQueueQuery,
  PortNotePage,
  PortNoteQuery,
  PortNoteRecord,
  PortNoteSubmission,
  PortNoteSummary,
  ProfileReadModel,
  PortNoteAccuracyState,
  PortNoteModerationState,
  PortNoteTopic,
  PortNoteVisibility,
} from "../../types";
import type { PortNotesRepository } from "../contracts/port-notes-repository";
import type { RequestOptions } from "../contracts/request-context";
import { ServiceError } from "../service-errors";
import { getSupabaseClient, hasSupabaseConfig } from "./supabase-client";
import { resolveUserRank } from "../../features/user-rank/user-rank";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function mapPortNote(value: unknown): PortNoteRecord {
  const row = asRecord(Array.isArray(value) ? value[0] : value);
  const accuracy = asRecord(row.accuracy);
  const state = accuracy.state;
  const moderationState = row.moderation_state;
  const topic = row.topic;
  const visibility = row.visibility;
  const authorStaffTitle = row.author_staff_title;
  const authorRank = asRecord(row.author_rank);
  const safeAccuracyState: PortNoteAccuracyState =
    state === "communityConfirmed" || state === "needsReview"
      ? state
      : "needsConfirmation";
  const safeModerationState: PortNoteModerationState =
    moderationState === "notRequired" ||
    moderationState === "pending" ||
    moderationState === "rejected" ||
    moderationState === "quarantined"
      ? moderationState
      : "approved";
  const safeTopic: PortNoteTopic =
    topic === "physicalSim" ||
    topic === "shoreLeave" ||
    topic === "food" ||
    topic === "shopping" ||
    topic === "welfare" ||
    topic === "general"
      ? topic
      : "esim";
  const safeVisibility: PortNoteVisibility = visibility === "private" ? "private" : "public";

  return {
    id: typeof row.id === "string" ? row.id : "unknown",
    portKey: typeof row.port_key === "string" ? row.port_key : "",
    contextKey: typeof row.context_key === "string" ? row.context_key : undefined,
    topic: safeTopic,
    visibility: safeVisibility,
    moderationState: safeModerationState,
    summary: typeof row.summary === "string" ? row.summary : "",
    details: asRecord(row.details) as Readonly<Record<string, string>>,
    contact: typeof row.contact === "string" ? row.contact : undefined,
    contactIsPublicBusiness: row.contact_is_public_business === true,
    publicAlias:
      typeof row.public_alias === "string" && row.public_alias.length > 0
        ? row.public_alias
        : "Thuyền viên CrewPort",
    authorStaffTitle:
      authorStaffTitle === "admin" || authorStaffTitle === "moderator"
        ? authorStaffTitle
        : undefined,
    authorRank: Object.keys(authorRank).length > 0 ? resolveUserRank(Number(authorRank.xp ?? 0)) : undefined,
    highlyUseful: row.highly_useful === true,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : undefined,
    lastVerifiedAt: typeof row.last_verified_at === "string" ? row.last_verified_at : undefined,
    createdAt: typeof row.created_at === "string" ? row.created_at : "",
    authorId: typeof row.author_id === "string" ? row.author_id : undefined,
    accuracy: {
      state: safeAccuracyState,
      stillCorrect: Number(accuracy.stillCorrect ?? accuracy.still_correct ?? 0),
      changed: Number(accuracy.changed ?? 0),
      notSure: Number(accuracy.notSure ?? accuracy.not_sure ?? 0),
      viewerAnswer:
        accuracy.viewerAnswer === "changed" ||
        accuracy.viewerAnswer === "notSure" ||
        accuracy.viewerAnswer === "stillCorrect"
          ? accuracy.viewerAnswer
          : undefined,
    },
  };
}

export class UnavailablePortNotesRepository implements PortNotesRepository {
  isConfigured(): boolean {
    return false;
  }

  async getSummary(): Promise<PortNoteSummary> {
    return { communityCount: 0, topics: [] };
  }

  async listTopicNotes(): Promise<PortNotePage> {
    return { items: [] };
  }

  async listMyNotes(): Promise<readonly PortNoteRecord[]> {
    return [];
  }

  async listAllMyNotes(): Promise<readonly PortNoteRecord[]> {
    return [];
  }

  async submitNote(): Promise<PortNoteRecord> {
    throw new ServiceError("notes-not-configured", "Port notes are not configured.");
  }

  async assessAccuracy(): Promise<void> {
    throw new ServiceError("notes-not-configured", "Port notes are not configured.");
  }

  async listModerationQueue(): Promise<readonly PortNoteRecord[]> {
    return [];
  }

  async moderateNote(): Promise<void> {
    throw new ServiceError("notes-not-configured", "Port notes are not configured.");
  }

  async getProfile(): Promise<ProfileReadModel> {
    throw new ServiceError("auth-required", "Sign-in is required.");
  }
}

export class SupabasePortNotesRepository implements PortNotesRepository {
  isConfigured(): boolean {
    return hasSupabaseConfig();
  }

  async getSummary(
    portKey: string,
    contextKey?: string,
    options: RequestOptions = {},
  ): Promise<PortNoteSummary> {
    const client = await getSupabaseClient();
    if (!client) {
      return { communityCount: 0, topics: [] };
    }
    if (options.signal?.aborted) {
      throw new DOMException("The request was aborted.", "AbortError");
    }
    const { data, error } = await client.rpc("get_port_note_summary", {
      p_port_key: portKey,
      p_context_key: contextKey ?? null,
    });
    if (error) {
      throw error;
    }
    const row = asRecord(data);
    const topics = Array.isArray(row.topics) ? row.topics : [];
    return {
      communityCount: Number(row.community_count ?? 0),
      topics: topics.map((topic) => {
        const item = asRecord(topic);
        return {
          topic: (item.topic as PortNoteTopic) ?? "general",
          approvedCount: Number(item.approved_count ?? 0),
          pendingForViewerCount: Number(item.pending_for_viewer_count ?? 0),
        };
      }),
    };
  }

  async listTopicNotes(query: PortNoteQuery): Promise<PortNotePage> {
    const client = await getSupabaseClient();
    if (!client) {
      return { items: [] };
    }
    if (query.signal?.aborted) {
      throw new DOMException("The request was aborted.", "AbortError");
    }
    const { data, error } = await client.rpc("list_port_topic_notes", {
      p_port_key: query.portKey,
      p_context_key: query.contextKey ?? null,
      p_topic: query.topic,
      p_cursor: query.cursor ?? null,
      p_limit: Math.min(query.limit ?? 5, 20),
    });
    if (error) {
      throw error;
    }
    const row = asRecord(data);
    return {
      items: Array.isArray(row.items) ? row.items.map(mapPortNote) : [],
      nextCursor: typeof row.next_cursor === "string" ? row.next_cursor : undefined,
    };
  }

  async listMyNotes(
    portKey: string,
    contextKey?: string,
    options: RequestOptions = {},
  ): Promise<readonly PortNoteRecord[]> {
    const client = await getSupabaseClient();
    if (!client) {
      return [];
    }
    if (options.signal?.aborted) {
      throw new DOMException("The request was aborted.", "AbortError");
    }
    const { data, error } = await client.rpc("list_my_port_notes", {
      p_port_key: portKey,
      p_context_key: contextKey ?? null,
    });
    if (error) {
      throw error;
    }
    return Array.isArray(data) ? data.map(mapPortNote) : [];
  }

  async listAllMyNotes(options: RequestOptions = {}): Promise<readonly PortNoteRecord[]> {
    const client = await getSupabaseClient();
    if (!client) return [];
    if (options.signal?.aborted) {
      throw new DOMException("The request was aborted.", "AbortError");
    }
    const { data, error } = await client.rpc("list_all_my_port_notes");
    if (error) throw error;
    return Array.isArray(data) ? data.map(mapPortNote) : [];
  }

  async submitNote(submission: PortNoteSubmission): Promise<PortNoteRecord> {
    const client = await getSupabaseClient();
    if (!client) {
      throw new ServiceError("notes-not-configured", "Port notes are not configured.");
    }
    const { data, error } = await client.rpc("submit_port_note", {
      p_port_key: submission.portKey,
      p_context_key: submission.contextKey ?? null,
      p_topic: submission.topic,
      p_visibility: submission.visibility,
      p_takeaway: submission.takeaway,
      p_details: submission.details,
      p_contact: submission.contact ?? null,
      p_contact_is_public_business: submission.contactIsPublicBusiness,
      p_idempotency_key: submission.idempotencyKey,
    });
    if (error) {
      throw error;
    }
    return mapPortNote(data);
  }

  async assessAccuracy(noteId: string, answer: AccuracyAnswer): Promise<void> {
    const client = await getSupabaseClient();
    if (!client) {
      throw new ServiceError("notes-not-configured", "Port notes are not configured.");
    }
    const { error } = await client.rpc("assess_port_note", {
      p_note_id: noteId,
      p_answer: answer,
    });
    if (error) {
      throw error;
    }
  }

  async listModerationQueue(
    query: ModerationQueueQuery,
  ): Promise<readonly PortNoteRecord[]> {
    const client = await getSupabaseClient();
    if (!client) {
      return [];
    }
    const { data, error } = await client.rpc("list_moderation_queue", {
      p_state: query.state ?? null,
      p_port_key: query.portKey ?? null,
      p_topic: query.topic ?? null,
    });
    if (error) {
      throw error;
    }
    return Array.isArray(data) ? data.map(mapPortNote) : [];
  }

  async moderateNote(action: ModerationAction): Promise<void> {
    const client = await getSupabaseClient();
    if (!client) {
      throw new ServiceError("notes-not-configured", "Port notes are not configured.");
    }
    const { error } = await client.rpc("moderate_port_note", {
      p_note_id: action.noteId,
      p_next_state: action.nextState,
      p_reason: action.reason ?? null,
      p_idempotency_key: action.idempotencyKey,
    });
    if (error) {
      throw error;
    }
  }

  async getProfile(): Promise<ProfileReadModel> {
    throw new ServiceError("auth-required", "Use AuthRepository for profile access.");
  }
}
