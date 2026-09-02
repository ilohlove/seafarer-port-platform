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
const AdminCorrectionsRoute = lazy(() =>
  import("../features/admin/AdminCorrectionsRoute").then((module) => ({ default: module.AdminCorrectionsRoute })),
);
const AdminFeedbackRoute = lazy(() => import("../features/admin/AdminFeedbackRoute").then((module) => ({ default: module.AdminFeedbackRoute })));
const AdminReputationLedgerRoute = lazy(() => import("../features/admin/AdminReputationLedgerRoute").then((module) => ({ default: module.AdminReputationLedgerRoute })));
const AdminUserReputationRoute = lazy(() => import("../features/admin/AdminUserReputationRoute").then((module) => ({ default: module.AdminUserReputationRoute })));

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

const IdentityGalleryRoute = lazy(() =>
  import("../features/user-rank/IdentityGalleryRoute").then((module) => ({
    default: module.IdentityGalleryRoute,
  })),
);

const XpHistoryRoute = lazy(() =>
  import("../features/reputation/XpHistoryRoute").then((module) => ({
    default: module.XpHistoryRoute,
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
            <Route path="/profile/xp-history" element={<XpHistoryRoute />} />
            <Route path="/admin/notes" element={<AdminNotesRoute />} />
            <Route path="/admin/moderation/corrections" element={<AdminCorrectionsRoute />} />
            <Route path="/admin/moderation/feedback" element={<AdminFeedbackRoute />} />
            <Route path="/admin/reputation/ledger" element={<AdminReputationLedgerRoute />} />
            <Route path="/admin/users/:userId/reputation" element={<AdminUserReputationRoute />} />
            <Route path="/auth/callback" element={<AuthCallbackRoute />} />
            <Route path="/my-notes" element={<MyNotesRoute />} />
            <Route path="/foundation" element={<FoundationRoute />} />
            <Route path="/design/ranks" element={<IdentityGalleryRoute />} />
            <Route path="/ports/:portSlug" element={<PortNotesRoute />} />
            <Route path="*" element={<NotImplementedRoute />} />
          </Routes>
        </Suspense>
      </AppShell>
    </BrowserRouter>
  );
}
