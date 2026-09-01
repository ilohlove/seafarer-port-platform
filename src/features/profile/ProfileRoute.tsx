import { useEffect, useMemo, useState } from "react";

import { EmptyState, Skeleton } from "../../components";
import { useBandwidthMode, useServices, useSession } from "../../app/providers";
import { useI18n } from "../../i18n";
import { DEFAULT_USER_RANK, UserRankIdentity } from "../user-rank";
import styles from "./profile.module.css";

function Avatar({
  name,
  src,
  allowImage,
}: {
  readonly name: string;
  readonly src?: string;
  readonly allowImage: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "C";

  return (
    <span className={styles.avatar} aria-hidden="true">
      {allowImage && src && !failed ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        initial
      )}
    </span>
  );
}

export function ProfileRoute() {
  const services = useServices();
  const session = useSession();
  const { mode } = useBandwidthMode();
  const { t } = useI18n();
  const [fullName, setFullName] = useState(session.profile?.fullName ?? "");
  const [nickname, setNickname] = useState(session.profile?.nickname ?? "");
  const [isLoading, setIsLoading] = useState(session.status === "loading");
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<"success" | "error">();

  useEffect(() => {
    if (session.status !== "authenticated") {
      setIsLoading(session.status === "loading");
      return;
    }

    if (session.profile) {
      setFullName(session.profile.fullName);
      setNickname(session.profile.nickname ?? "");
      setIsLoading(false);
      return;
    }

    let active = true;
    void services.auth
      .getProfile()
      .then((profile) => {
        if (active) {
          setFullName(profile.fullName);
          setNickname(profile.nickname ?? "");
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [services, session]);

  const normalizedNickname = nickname.trim().toLowerCase();
  const fullNameValid = fullName.trim().length >= 2 && fullName.trim().length <= 80;
  const nicknameValid =
    normalizedNickname.length === 0 || /^[a-z0-9_]{3,24}$/u.test(normalizedNickname);
  const isDirty = useMemo(
    () =>
      session.profile
        ? fullName.trim() !== session.profile.fullName ||
          normalizedNickname !== (session.profile.nickname ?? "")
        : Boolean(fullName.trim() || normalizedNickname),
    [fullName, normalizedNickname, session.profile],
  );

  async function signIn() {
    setNotice(undefined);
    try {
      await services.auth.signInWithGoogle("/profile");
    } catch {
      setNotice("error");
    }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(undefined);
    if (!fullNameValid || !nicknameValid || !isDirty) {
      setNotice("error");
      return;
    }

    setIsSaving(true);
    try {
      await services.auth.updateProfile({
        fullName: fullName.trim(),
        nickname: normalizedNickname || undefined,
      });
      setNotice("success");
    } catch {
      setNotice("error");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <Skeleton label={t("state.loading")} lines={5} variant="card" />;
  }

  if (session.status !== "authenticated" || !session.profile) {
    return (
      <EmptyState
        heading={t("profile.loginRequired")}
        description={t("settings.loginPlaceholder")}
        action={{ label: t("settings.loginLabel"), onClick: () => void signIn() }}
        announce
      />
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.card} aria-labelledby="profile-heading">
        <header className={styles.header}>
          <Avatar
            name={fullName}
            src={session.profile.avatarUrl}
            allowImage={mode === "standard"}
          />
          <div>
            <p className={styles.eyebrow}>{t("profile.googleAccount")}</p>
            <h1 id="profile-heading">{t("profile.heading")}</h1>
            <p className={styles.email}>{session.profile.email}</p>
            <p className={styles.avatarHelp}>{t("profile.avatarFromGoogle")}</p>
          </div>
        </header>

        <section className={styles.rankPanel} aria-labelledby="profile-rank-heading">
          <h2 id="profile-rank-heading">{t("rank.profileHeading")}</h2>
          <UserRankIdentity
            alias={session.profile.nickname ?? fullName}
            rank={session.profile.rank ?? DEFAULT_USER_RANK}
            avatarUrl={session.profile.avatarUrl}
            showProgress
          />
        </section>

        <form className={styles.form} onSubmit={(event) => void saveProfile(event)}>
          <label className={styles.field}>
            <span>{t("profile.fullName")}</span>
            <input
              type="text"
              value={fullName}
              autoComplete="name"
              maxLength={80}
              onChange={(event) => setFullName(event.currentTarget.value)}
            />
            <small>{t("profile.fullNameHelp")}</small>
          </label>

          <label className={styles.field}>
            <span>{t("profile.nickname")}</span>
            <span className={styles.nicknameInput}>
              <span aria-hidden="true">@</span>
              <input
                type="text"
                value={nickname}
                placeholder={t("profile.nicknamePlaceholder")}
                autoComplete="off"
                maxLength={24}
                inputMode="text"
                onChange={(event) => setNickname(event.currentTarget.value)}
              />
            </span>
            <small>{t("profile.nicknameHelp")}</small>
            <small>{t("profile.nicknamePublic")}</small>
          </label>

          {notice === "success" ? (
            <output className={styles.success}>
              {t("profile.updated")}
            </output>
          ) : null}
          {notice === "error" ? (
            <p className={styles.error} role="alert">
              {!fullNameValid
                ? t("profile.invalidFullName")
                : !nicknameValid
                  ? t("profile.invalidNickname")
                  : t("profile.updateError")}
            </p>
          ) : null}

          <button
            className={styles.submit}
            type="submit"
            disabled={isSaving || !isDirty || !fullNameValid || !nicknameValid}
          >
            {isSaving ? t("profile.updating") : t("profile.update")}
          </button>
        </form>
      </section>
    </div>
  );
}
