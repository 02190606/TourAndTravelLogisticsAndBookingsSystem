import { Component, type ReactNode } from 'react'

const RELOAD_KEY = 'oc_rl'
const RELOAD_THROTTLE = 10_000

function isChunkError(error: Error): boolean {
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Loading chunk|Importing a module script failed/i.test(error.message)
}

function silentReload(): void {
  const now = Date.now()
  const last = parseInt(sessionStorage.getItem(RELOAD_KEY) ?? '0', 10)
  if (now - last > RELOAD_THROTTLE) {
    sessionStorage.setItem(RELOAD_KEY, String(now))
    window.location.reload()
  }
}

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  isChunkError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, isChunkError: false }

  static getDerivedStateFromError(error: Error): State {
    if (isChunkError(error)) {
      return { hasError: true, error, isChunkError: true }
    }
    return { hasError: true, error, isChunkError: false }
  }

  componentDidCatch(error: Error) {
    if (isChunkError(error)) {
      silentReload()
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.state.isChunkError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-text-secondary">Loading latest version&hellip;</p>
          </div>
        </div>
      )
    }

    if (this.props.fallback) return this.props.fallback

    return (
      <div className="min-h-[400px] flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 mx-auto rounded-full bg-danger/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-text-primary">Something went wrong</h3>
          <p className="text-sm text-text-secondary">{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null, isChunkError: false }); window.location.reload() }}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 cursor-pointer"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }
}
