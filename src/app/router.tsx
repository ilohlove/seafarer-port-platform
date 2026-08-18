import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";

import { EmptyState, Skeleton } from "../components";
import { FoundationRoute } from "../features/foundation";
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
  return (
    <EmptyState
      heading="Route này thuộc milestone sau"
      description="Foundation đã giữ chỗ cho route, nhưng UI sản phẩm chưa được triển khai trong F1."
      action={{
        label: "Quay lại foundation",
        href: "/foundation",
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
            <Route path="/" element={<Navigate to="/ports/busan" replace />} />
            <Route path="/foundation" element={<FoundationRoute />} />
            <Route path="/ports/:portSlug" element={<PortNotesRoute />} />
            <Route path="*" element={<NotImplementedRoute />} />
          </Routes>
        </Suspense>
      </AppShell>
    </BrowserRouter>
  );
}
