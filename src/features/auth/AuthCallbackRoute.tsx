import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { EmptyState, Skeleton } from "../../components";
import { useServices } from "../../app/providers";
import { useI18n } from "../../i18n";

function safeReturnPath(value: string | null): string {
  if (!value) {
    return "/profile";
  }
  try {
    const resolved = new URL(value, window.location.origin);
    return resolved.origin === window.location.origin
      ? `${resolved.pathname}${resolved.search}${resolved.hash}`
      : "/profile";
  } catch {
    return "/profile";
  }
}

export function AuthCallbackRoute() {
  const services = useServices();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void services.auth
      .getState()
      .then((state) => {
        if (!active) return;
        if (state.status === "authenticated") {
          const returnTo = new URLSearchParams(location.search).get("returnTo");
          navigate(safeReturnPath(returnTo), { replace: true });
        } else {
          setFailed(true);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [location.search, navigate, services]);

  if (failed) {
    return (
      <EmptyState
        heading={t("auth.callbackError")}
        description={t("settings.loginPlaceholder")}
        action={{ label: t("profile.heading"), href: "/profile" }}
        announce
      />
    );
  }

  return <Skeleton label={t("auth.callbackLoading")} lines={3} variant="card" />;
}
