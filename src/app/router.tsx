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

const SearchRoute = lazy(() =>
  import("../features/search/SearchRoute").then((module) => ({
    default: module.SearchRoute,
  })),
);

const CommunityRoute = lazy(() =>
  import("../features/community/CommunityRoute").then((module) => ({
    default: module.CommunityRoute,
  })),
);

const ProfileRoute = lazy(() =>
  import("../features/profile/ProfileRoute").then((module) => ({
    default: module.ProfileRoute,
  })),
);

const AdminNotesRoute = lazy(() =>
  import("../features/admin/AdminNotesRoute").then((module) => ({
    default: module.AdminNotesRoute,
  })),
);

const AuthCallbackRoute = lazy(() =>
  import("../features/auth/AuthCallbackRoute").then((module) => ({
    default: module.AuthCallbackRoute,
  })),
);

const MyNotesRoute = lazy(() =>
  import("../features/my-notes/MyNotesRoute").then((module) => ({
    default: module.MyNotesRoute,
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
            <Route path="/search" element={<SearchRoute />} />
            <Route path="/community" element={<CommunityRoute />} />
            <Route path="/profile" element={<ProfileRoute />} />
            <Route path="/admin/notes" element={<AdminNotesRoute />} />
            <Route path="/auth/callback" element={<AuthCallbackRoute />} />
            <Route path="/my-notes" element={<MyNotesRoute />} />
            <Route path="/foundation" element={<FoundationRoute />} />
            <Route path="/ports/:portSlug" element={<PortNotesRoute />} />
            <Route path="*" element={<NotImplementedRoute />} />
          </Routes>
        </Suspense>
      </AppShell>
    </BrowserRouter>
  );
}
