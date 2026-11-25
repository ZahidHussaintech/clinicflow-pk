import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Temporary Display Recovery</h2>
            <p className="text-sm text-slate-600">
              Your patient and token records are safely stored. Tap below to reload the workspace.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-semibold cursor-pointer"
            >
              Reload ClinicFlow PK
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
