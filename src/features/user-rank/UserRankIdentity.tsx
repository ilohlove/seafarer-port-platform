import { useEffect, useId, useRef, useState } from "react";

import { useBandwidthModeValue } from "../../app/providers";
import { useI18n } from "../../i18n";
import type { BandwidthMode, StaffTitle, SupporterTier, UserRankReadModel } from "../../types";
import { type FrameArtwork, type PlaqueArtwork, RANK_ARTWORK, STAFF_ARTWORK, SUPPORTER_ARTWORK } from "./identity-artwork";
import { IdentityIcon } from "./IdentityIcon";
import { STAFF_TITLES, SUPPORTER_TIERS, USER_RANKS, formatXp, getLocalizedRankName } from "./user-rank";
import styles from "./user-rank.module.css";

interface AvatarProps {
  readonly alias: string;
  readonly avatarUrl?: string;
  readonly bandwidthMode?: BandwidthMode;
}

function Avatar({ alias, avatarUrl, bandwidthMode = "standard" }: AvatarProps) {
  const initial = alias.trim().charAt(0).toUpperCase() || "C";
  return avatarUrl && bandwidthMode !== "ultraLite"
    ? <img src={avatarUrl} alt="" loading="lazy" decoding="async" />
    : <span aria-hidden="true">{initial}</span>;
}

function FrameArtworkImage({ artwork, mode, sizes }: { readonly artwork: FrameArtwork; readonly mode: BandwidthMode; readonly sizes: string }) {
  if (mode === "ultraLite") return null;
  return <img className={styles.frameArtwork} data-identity-artwork="frame" src={artwork.src160} srcSet={mode === "standard" ? `${artwork.src160} 160w, ${artwork.src320} 320w` : undefined} sizes={mode === "standard" ? sizes : undefined} width={320} height={320} alt="" loading="lazy" decoding="async" />;
}

function PlaqueArtworkImage({ artwork, mode, compact }: { readonly artwork: PlaqueArtwork; readonly mode: BandwidthMode; readonly compact: boolean }) {
  if (mode === "ultraLite") return null;
  return <img src={artwork.src160} srcSet={mode === "standard" ? `${artwork.src160} 160w, ${artwork.src320} 320w` : undefined} sizes={mode === "standard" ? (compact ? "148px" : "min(320px, 100vw)") : undefined} width={artwork.width} height={artwork.height} alt="" loading="lazy" decoding="async" />;
}

export function RankAvatarFrame({ alias, avatarUrl, rank, size = "compact", bandwidthMode }: AvatarProps & { readonly rank: UserRankReadModel; readonly size?: "compact" | "profile" }) {
  const contextMode = useBandwidthModeValue();
  const mode = bandwidthMode ?? contextMode;
  const definition = USER_RANKS[rank.level];
  const artwork = RANK_ARTWORK[rank.level];
  return (
    <span className={styles.avatarFrame} data-artwork={mode !== "ultraLite"} data-frame-kind="rank" data-rank-level={rank.level} data-size={size}>
      <span className={styles.avatar}><Avatar alias={alias} avatarUrl={avatarUrl} bandwidthMode={mode} /></span>
      <FrameArtworkImage artwork={artwork} mode={mode} sizes={size === "compact" ? "48px" : "200px"} />
      <span className={styles.crest}><IdentityIcon name={definition.icon} /></span>
    </span>
  );
}

export function StaffAvatarFrame({ alias, avatarUrl, staffTitle, size = "compact", bandwidthMode }: AvatarProps & { readonly staffTitle: StaffTitle; readonly size?: "compact" | "profile" }) {
  const contextMode = useBandwidthModeValue();
  const mode = bandwidthMode ?? contextMode;
  const staff = STAFF_TITLES[staffTitle];
  return (
    <span className={styles.avatarFrame} data-artwork={mode !== "ultraLite"} data-frame-kind="staff" data-staff-title={staffTitle} data-size={size}>
      <span className={styles.avatar}><Avatar alias={alias} avatarUrl={avatarUrl} bandwidthMode={mode} /></span>
      <FrameArtworkImage artwork={STAFF_ARTWORK[staffTitle]} mode={mode} sizes={size === "compact" ? "48px" : "208px"} />
      <span className={styles.crest}><IdentityIcon name={staff.icon} /></span>
    </span>
  );
}

export function SupporterBadge({ tier, compact = false, bandwidthMode }: { readonly tier: SupporterTier; readonly compact?: boolean; readonly bandwidthMode?: BandwidthMode }) {
  const contextMode = useBandwidthModeValue();
  const mode = bandwidthMode ?? contextMode;
  const supporter = SUPPORTER_TIERS[tier];
  return (
    <span className={styles.supporterBadge} data-artwork={mode !== "ultraLite"} data-supporter-tier={tier} data-compact={compact || undefined}>
      <PlaqueArtworkImage artwork={SUPPORTER_ARTWORK[tier]} mode={mode} compact={compact} />
      <IdentityIcon name={supporter.icon} className={styles.supporterFallbackIcon} />
      <span>{compact ? tier.toUpperCase() : supporter.tag}</span>
    </span>
  );
}

export function RankProgress({ rank }: { readonly rank: UserRankReadModel }) {
  const { locale } = useI18n();
  const progressLabel = rank.nextRank
    ? locale === "vi"
      ? `${formatXp(rank.xpToNextRank ?? 0, locale)} XP để đạt ${getLocalizedRankName(rank.nextRank, locale)}`
      : `${formatXp(rank.xpToNextRank ?? 0, locale)} XP to ${getLocalizedRankName(rank.nextRank, locale)}`
    : locale === "vi" ? "Cấp cao nhất" : "Highest rank";
  return <div className={styles.progressBlock}><div><span>{formatXp(rank.xp, locale)} XP</span><span>{progressLabel}</span></div><progress aria-label={locale === "vi" ? "Tiến độ hạng" : "Rank progress"} max={100} value={rank.progressPercent} /></div>;
}

export interface UserIdentityProps extends AvatarProps {
  readonly rank?: UserRankReadModel;
  readonly staffTitle?: StaffTitle;
  readonly supporterTier?: SupporterTier;
  readonly context?: string;
  readonly compact?: boolean;
  readonly showProgress?: boolean;
}

export function UserIdentity({ alias, avatarUrl, rank, staffTitle, supporterTier, context, compact = true, showProgress = false, bandwidthMode }: UserIdentityProps) {
  const contextMode = useBandwidthModeValue();
  const mode = bandwidthMode ?? contextMode;
  const { locale } = useI18n();
  const staff = staffTitle ? STAFF_TITLES[staffTitle] : undefined;
  return (
    <div className={styles.identity} data-identity-kind={staff ? "staff" : "member"}>
      {staff ? <StaffAvatarFrame alias={alias} avatarUrl={avatarUrl} bandwidthMode={mode} staffTitle={staffTitle!} size={compact ? "compact" : "profile"} /> : rank ? <RankAvatarFrame alias={alias} avatarUrl={avatarUrl} bandwidthMode={mode} rank={rank} size={compact ? "compact" : "profile"} /> : <span className={styles.plainAvatar}><Avatar alias={alias} avatarUrl={avatarUrl} bandwidthMode={mode} /></span>}
      <div className={styles.identityBody}>
        <strong className={rank && !staff ? styles.rankUsername : undefined} data-rank-level={rank && !staff ? rank.level : undefined} data-rank-username={rank && !staff ? true : undefined}>{alias}</strong>
        {staff ? <><span className={styles.staffName}>{staff.name}</span><span className={styles.staffTag} data-staff-title={staffTitle}>{staff.tag}</span></> : rank ? <><span className={styles.rankName}>{getLocalizedRankName(rank, locale)}{context ? ` · ${context}` : ""}</span>{supporterTier ? <SupporterBadge tier={supporterTier} compact={compact} bandwidthMode={mode} /> : null}{showProgress ? <RankProgress rank={rank} /> : null}</> : null}
      </div>
    </div>
  );
}

export function RankPopover({ alias, avatarUrl, rank, staffTitle, supporterTier }: AvatarProps & { readonly rank: UserRankReadModel; readonly staffTitle?: StaffTitle; readonly supporterTier?: SupporterTier }) {
  const { locale } = useI18n();
  const rankName = getLocalizedRankName(rank, locale);
  const staff = staffTitle ? STAFF_TITLES[staffTitle] : undefined;
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    const closeOutside = (event: PointerEvent) => !root.current?.contains(event.target as Node) && setOpen(false);
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    return () => { document.removeEventListener("keydown", closeOnEscape); document.removeEventListener("pointerdown", closeOutside); };
  }, [open]);
  const detailLabel = staff
    ? `${staff.name} Staff details`
    : locale === "vi" ? `Chi tiết hạng ${rankName}` : `${rankName} rank details`;
  return (
    <div className={styles.popoverRoot} ref={root}>
      <button type="button" className={styles.popoverTrigger} aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}>
        {staffTitle
          ? <StaffAvatarFrame alias={alias} avatarUrl={avatarUrl} staffTitle={staffTitle} />
          : <RankAvatarFrame alias={alias} avatarUrl={avatarUrl} rank={rank} />}
        <span className={styles.popoverLabel}>
          <strong className={!staff ? styles.rankUsername : undefined} data-rank-level={!staff ? rank.level : undefined} data-rank-username={!staff ? true : undefined}>{alias}</strong>
          <span>{staff?.name ?? rankName}</span>
        </span>
      </button>
      {open ? <dialog className={styles.popover} id={id} aria-label={detailLabel} open><UserIdentity alias={alias} avatarUrl={avatarUrl} rank={rank} staffTitle={staffTitle} supporterTier={supporterTier} compact={false} showProgress={!staff} /></dialog> : null}
    </div>
  );
}

export function RankCard({ rank, alias = rank.name, avatarUrl, bandwidthMode }: { readonly rank: UserRankReadModel; readonly alias?: string; readonly avatarUrl?: string; readonly bandwidthMode?: BandwidthMode }) {
  const contextMode = useBandwidthModeValue();
  const mode = bandwidthMode ?? contextMode;
  const { locale } = useI18n();
  return <article className={styles.rankCard} data-rank-level={rank.level}><RankAvatarFrame alias={alias} avatarUrl={avatarUrl} bandwidthMode={mode} rank={rank} size="profile" /><h3 className={styles.rankUsername} data-rank-level={rank.level} data-rank-username>{alias}</h3><p>{getLocalizedRankName(rank, locale)}</p><span className={styles.xpRange} data-rank-xp-range>{formatXp(rank.minXp, locale)}–{rank.maxXp === null ? "∞" : formatXp(rank.maxXp, locale)} XP</span></article>;
}

/** Compatibility wrapper for existing Port Notes/Profile call sites. */
export function UserRankIdentity(props: { readonly alias: string; readonly rank: UserRankReadModel; readonly staffTitle?: StaffTitle; readonly context?: string; readonly showProgress?: boolean; readonly avatarUrl?: string }) {
  return <UserIdentity {...props} compact={!props.showProgress} />;
}
