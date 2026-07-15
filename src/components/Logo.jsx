import logoUrl from '../assets/logo.jpg'

/**
 * Lindaville Ace Paddlers brand logo.
 * Renders the official emblem in a rounded container so the black-background
 * artwork blends into the UI cleanly at any size.
 *
 * @param {number} size  Rendered square size in px.
 * @param {string} className  Extra classes for the wrapper.
 * @param {boolean} ring  Show a subtle amber ring (nice on light surfaces).
 */
export default function Logo({ size = 40, className = '', ring = false }) {
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(8, size * 0.24),
        background: '#0d0d0d',
        boxShadow: ring ? '0 0 0 2px rgba(240,180,41,0.5)' : undefined,
      }}
    >
      <img
        src={logoUrl}
        alt="Lindaville Ace Paddlers logo"
        width={size}
        height={size}
        loading="eager"
        decoding="async"
        className="w-full h-full object-cover"
        style={{ transform: 'scale(1.08)' }}
      />
    </span>
  )
}
