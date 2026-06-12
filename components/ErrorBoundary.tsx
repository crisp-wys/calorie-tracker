'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
          <div className="text-5xl">😵</div>
          <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-zcool-xiaowei)' }}>
            出了点问题
          </h2>
          <p className="text-sm text-[#C4B5A5] max-w-xs">
            页面遇到了一些意外错误，请尝试刷新页面
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="rounded-xl bg-[#D95959] px-6 py-3 text-sm font-medium text-white shadow-md shadow-[#D95959]/20 transition-all active:shadow-sm active:brightness-90"
          >
            刷新页面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
