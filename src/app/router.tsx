import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";

import { EmptyState, Skeleton } from "../components";
import { FoundationRoute } from "../features/foundation";
import { useI18n } from "../i18n";
import { AppShell } from "./shell";

const PortHubRoute = lazy(() =>
  import("../features/port-hub/PortHubRoute").then((module) => ({
    default: module.PortHubRoute,
  })),
);

function RouteFallback() {
  const { t } = useI18n();
  return <Skeleton label={t("portHub.loading")} lines={6} variant="card" />;
}

function NotImplementedRoute() {
  return (
    <EmptyState
      heading="Route này thuộc milestone sau"
      description="Foundation đã giữ chỗ cho route, nhưng UI sản phẩm chưa được triển khai trong F1."
      action={{
        label: "Quay lại foundation",
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
            <Route path="/" element={<FoundationRoute />} />
            <Route path="/ports/:portSlug" element={<PortHubRoute />} />
            <Route path="*" element={<NotImplementedRoute />} />
          </Routes>
        </Suspense>
      </AppShell>
    </BrowserRouter>
  );
}
