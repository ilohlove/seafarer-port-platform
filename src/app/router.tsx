import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";

import { EmptyState, Skeleton } from "../components";
import { FoundationRoute } from "../features/foundation";
import { HomeRoute } from "../features/home";
import { useI18n } from "../i18n";
import { AppShell } from "./shell";

const PortNotesRoute = lazy(() =>
  import("../features/port-hub/PortNotesRoute").then((module) => ({
    default: module.PortNotesRoute,
  })),
);

function RouteFallback() {
  const { t } = useI18n();
  return <Skeleton label={t("portNotes.loading")} lines={6} variant="card" />;
}

function NotImplementedRoute() {
  const { t } = useI18n();
  return (
    <EmptyState
      heading={t("home.notFound.heading")}
      description={t("home.notFound.description")}
      action={{
        label: t("home.notFound.action"),
        href: "/",
      }}
    />
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppShell>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/foundation" element={<FoundationRoute />} />
            <Route path="/ports/:portSlug" element={<PortNotesRoute />} />
            <Route path="*" element={<NotImplementedRoute />} />
          </Routes>
        </Suspense>
      </AppShell>
    </BrowserRouter>
  );
}
