import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  tabLabel: string;
}

interface State {
  error: Error | null;
}

export default class TabErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Tab "${this.props.tabLabel}" failed to render:`, error, info);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.tabLabel !== this.props.tabLabel && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="bg-surface-card border border-rose-200 bg-rose-50/50 rounded-xl p-6 text-center max-w-lg mx-auto mt-6 shadow-sm">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-text-primary mb-1">{this.props.tabLabel} failed to load</h2>
          <p className="text-xs text-text-muted mb-4 font-mono">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="btn-primary inline-flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload Module
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
