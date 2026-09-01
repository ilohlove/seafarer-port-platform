import { DEMO_MEMBERS, DEMO_STAFF, DEMO_SUPPORTERS } from "./identity-demo-data";
import { useI18n } from "../../i18n";
import {
  RankCard,
  StaffAvatarFrame,
  SupporterBadge,
  UserIdentity,
} from "./UserRankIdentity";
import { getLocalizedStaffName, STAFF_TITLES } from "./user-rank";
import styles from "./user-rank.module.css";

const sections = [
  ["levels", "Levels"],
  ["compact", "Forum cards"],
  ["profiles", "Profiles"],
  ["staff", "Staff"],
  ["supporters", "Supporters"],
] as const;

export function IdentityGalleryRoute() {
  const { locale } = useI18n();
  return (
    <main className={styles.gallery}>
      <header className={styles.galleryHeader}>
        <p className={styles.eyebrow}>CrewPort identity system</p>
        <h1>User Rank, Staff & Supporter</h1>
        <p>
          Mobile-first visual preview. Staff identities are separate from XP
          Rank.
        </p>
        <strong className={styles.demoBanner}>DEMO DATA · NOT PRODUCTION</strong>
        <nav className={styles.demoNav} aria-label="Identity demo sections">
          {sections.map(([id, label]) => (
            <a href={`#${id}`} key={id}>{label}</a>
          ))}
        </nav>
      </header>

      <section id="levels" aria-labelledby="rank-gallery-heading">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>10 member levels</p>
          <h2 id="rank-gallery-heading">Contribution Rank · 10 Levels</h2>
        </div>
        <div className={styles.rankGrid}>
          {DEMO_MEMBERS.map((member) => (
            <RankCard key={member.id} alias={member.alias} avatarUrl={member.avatarUrl} rank={member.rank} />
          ))}
        </div>
      </section>

      <section id="compact" aria-labelledby="compact-preview-heading">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Forum and comment</p>
          <h2 id="compact-preview-heading">Compact user cards</h2>
        </div>
        <div className={styles.compactGrid}>
          {DEMO_MEMBERS.map((member) => (
            <article className={styles.compactCard} key={member.id}>
              <UserIdentity
                alias={member.alias}
                avatarUrl={member.avatarUrl}
                context={member.context}
                rank={member.rank}
              />
            </article>
          ))}
        </div>
      </section>

      <section id="profiles" aria-labelledby="profile-preview-heading">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Large presentation</p>
          <h2 id="profile-preview-heading">Profile rank cards</h2>
        </div>
        <div className={styles.profileGrid}>
          {DEMO_MEMBERS.map((member) => (
            <article className={styles.profileCard} key={member.id}>
              <UserIdentity
                alias={member.alias}
                avatarUrl={member.avatarUrl}
                compact={false}
                rank={member.rank}
                showProgress
              />
            </article>
          ))}
        </div>
      </section>

      <section id="staff" aria-labelledby="staff-gallery-heading">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>4 operational identities</p>
          <h2 id="staff-gallery-heading">Staff · unique identity, no Level</h2>
        </div>
        <div className={styles.staffGrid}>
          {DEMO_STAFF.map((member) => {
            const staff = STAFF_TITLES[member.id];
            return (
              <article
                className={styles.staffCard}
                data-staff-title={staff.id}
                key={staff.id}
              >
                <StaffAvatarFrame
                  alias={member.alias}
                  avatarUrl={member.avatarUrl}
                  staffTitle={staff.id}
                  size="profile"
                />
                <h3>{getLocalizedStaffName(staff, locale)}</h3>
                <span>{staff.tag}</span>
                <UserIdentity alias={member.alias} avatarUrl={member.avatarUrl} staffTitle={staff.id} />
              </article>
            );
          })}
        </div>
      </section>

      <section id="supporters" aria-labelledby="supporter-gallery-heading">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>3 recognition tiers</p>
          <h2 id="supporter-gallery-heading">Supporter badges</h2>
          <p>Support does not change XP, permissions, or expertise.</p>
        </div>
        <div className={styles.supporterGrid}>
          {DEMO_SUPPORTERS.map((member) => (
            <article key={member.tier}>
              <SupporterBadge tier={member.tier} />
              <UserIdentity
                alias={member.alias}
                avatarUrl={member.avatarUrl}
                rank={member.rank}
                supporterTier={member.tier}
              />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
