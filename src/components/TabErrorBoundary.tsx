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
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-8 text-center max-w-lg mx-auto mt-8">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">{this.props.tabLabel} failed to load</h2>
          <p className="text-sm text-text-muted mb-4">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
