import { Buffer } from "buffer";
// @ts-ignore
import process from "process";
(globalThis as any).Buffer = Buffer;
(globalThis as any).process = process;

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

interface RootErrorBoundaryState {
  error: Error | null;
}

class RootErrorBoundary extends React.Component<
  React.PropsWithChildren,
  RootErrorBoundaryState
> {
  public constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { error: null };
  }

  public static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return { error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("RootErrorBoundary", error, errorInfo);
  }

  public render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "24px",
          color: "#e5e7eb",
          background: "#111214",
          fontFamily: "Segoe UI, sans-serif",
        }}
      >
        <h1 style={{ margin: "0 0 12px", fontSize: "20px" }}>
          Aplikacja zatrzymała się na błędzie runtime
        </h1>
        <pre
          style={{
            padding: "16px",
            whiteSpace: "pre-wrap",
            background: "#1a1b1e",
            border: "1px solid #2e3035",
            overflow: "auto",
          }}
        >
          {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
        </pre>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
);
