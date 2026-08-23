import { Component, type ErrorInfo, type ReactNode } from "react";

import { EmptyState } from "../components";
import { AppProviders } from "./providers";
import { AppRouter } from "./router";

interface ErrorBoundaryState {
  readonly error?: Error;
}

class AppErrorBoundary extends Component<
  { readonly children: ReactNode },
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Application render failed", error, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      const english = document.documentElement.lang === "en";
      return (
        <main className="content-container">
          <EmptyState
            heading={
              english
                ? "The prototype could not be displayed"
                : "Không thể hiển thị prototype"
            }
            description={this.state.error.message}
            action={{
              label: english ? "Reload" : "Tải lại",
              onClick: () => window.location.reload(),
            }}
            announce
          />
        </main>
      );
    }

    return this.props.children;
  }
}

export function App() {
  return (
    <AppErrorBoundary>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </AppErrorBoundary>
  );
}
