import { BrowserRouter, Route, Routes } from "react-router";

import { EmptyState } from "../components";
import { FoundationRoute } from "../features/foundation";
import { AppShell } from "./shell";

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
        <Routes>
          <Route path="/" element={<FoundationRoute />} />
          <Route path="*" element={<NotImplementedRoute />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
