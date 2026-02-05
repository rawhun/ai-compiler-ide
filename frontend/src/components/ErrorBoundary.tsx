import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
          <div className="max-w-2xl mx-auto p-8">
            <div className="bg-red-900 bg-opacity-50 border border-red-500 rounded-lg p-6">
              <h1 className="text-2xl font-bold text-red-300 mb-4">
                🚨 Application Error
              </h1>
              <p className="text-red-200 mb-4">
                Something went wrong. Please check the console for more details.
              </p>
              
              {this.state.error && (
                <div className="bg-gray-800 p-4 rounded mb-4">
                  <h3 className="text-lg font-semibold text-red-300 mb-2">Error Details:</h3>
                  <p className="text-red-200 font-mono text-sm">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              {this.state.errorInfo && (
                <div className="bg-gray-800 p-4 rounded mb-4">
                  <h3 className="text-lg font-semibold text-red-300 mb-2">Stack Trace:</h3>
                  <pre className="text-red-200 font-mono text-xs overflow-auto max-h-40">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Reload Page
                </button>
                <button
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  Clear Data & Reload
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;