import { Component, type ReactNode } from "react";
import { ErrorBlock } from "./States";

interface State {
  error: Error | null;
}

/** Keeps a crash in one view (e.g. a malformed body) from blanking the whole app. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorBlock
          message={`This view failed to render: ${this.state.error.message}`}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
