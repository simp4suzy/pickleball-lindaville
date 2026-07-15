import Logo from './Logo'

/**
 * Branded full-screen loader used while auth/session state is resolving.
 * Uses the official Lindaville Ace Paddlers logo with a subtle pulse.
 */
export default function PageLoader({ label = 'Loading' }) {
  return (
    <div
      className="min-h-[70vh] flex flex-col items-center justify-center gap-5 px-4"
      role="status"
      aria-live="polite"
    >
      <span className="relative inline-flex">
        <span className="absolute -inset-1 rounded-2xl bg-court-500/20 animate-ping" />
        <span className="relative animate-float">
          <Logo size={64} ring />
        </span>
      </span>
      <span className="type-label text-court-700 tracking-widest uppercase text-xs">
        {label}
        <span className="inline-flex ml-0.5">
          <span className="animate-bounce [animation-delay:-0.3s]">.</span>
          <span className="animate-bounce [animation-delay:-0.15s]">.</span>
          <span className="animate-bounce">.</span>
        </span>
      </span>
    </div>
  )
}
