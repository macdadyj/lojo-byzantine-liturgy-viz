import { Component, type ErrorInfo, type ReactNode } from "react";
import { describeError, noteError } from "../diagnostics";

type ErrorBoundaryProps = {
  /** Changing the key-like `resetKey` clears a caught error (e.g. "Try again"). */
  resetKey?: unknown;
  fallback: (error: unknown, detail: string) => ReactNode;
  children: ReactNode;
};

type ErrorBoundaryState = { error: unknown; detail: string; resetKey: unknown };

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, detail: "", resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return { error: error ?? new Error("Unknown error"), detail: describeError(error) };
  }

  static getDerivedStateFromProps(props: ErrorBoundaryProps, state: ErrorBoundaryState): Partial<ErrorBoundaryState> | null {
    if (props.resetKey !== state.resetKey) return { error: null, detail: "", resetKey: props.resetKey };
    return null;
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    const where = info.componentStack?.split("\n").filter(Boolean).slice(0, 3).join(" <") ?? "";
    noteError(`${describeError(error)}${where ? `\n  in ${where.trim()}` : ""}`);
  }

  render(): ReactNode {
    if (this.state.error) return this.props.fallback(this.state.error, this.state.detail);
    return this.props.children;
  }
}
