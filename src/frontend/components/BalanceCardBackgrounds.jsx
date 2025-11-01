/**
 * Balance Card Background Options
 * Collection of different background designs for BalanceCardV2
 */

// OPTION 1: Original Purple Gradient
export const BackgroundV1 = () => (
  <div style={{
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  }} />
);

// OPTION 2: Low-Poly Blue Gradient
export const BackgroundV2LowPoly = () => (
  <svg 
    viewBox="0 0 877 613" 
    width="100%" 
    height="100%" 
    xmlns="http://www.w3.org/2000/svg" 
    preserveAspectRatio="xMidYMid slice"
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 0,
    }}
  >
    <defs>
      {/* Base blue gradient */}
      <linearGradient id="baseBlue" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--poly-light, #4fc3f7)" />
        <stop offset="100%" stopColor="var(--poly-dark, #0d47a1)" />
      </linearGradient>

      {/* Highlight gradient for facets */}
      <linearGradient id="facetHighlight" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </linearGradient>

      {/* Vignette overlay */}
      <linearGradient id="vignette" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(0,0,0,0.05)" />
        <stop offset="100%" stopColor="rgba(0,0,0,0.25)" />
      </linearGradient>
    </defs>

    {/* Background base */}
    <rect width="100%" height="100%" fill="url(#baseBlue)" />

    {/* Low-poly facets (triangles) */}
    <polygon points="0,0 300,0 150,200" fill="url(#facetHighlight)" opacity="0.4"/>
    <polygon points="300,0 600,0 450,250" fill="rgba(255,255,255,0.08)"/>
    <polygon points="600,0 877,0 877,300 500,200" fill="rgba(255,255,255,0.15)"/>
    <polygon points="0,200 200,400 0,613" fill="rgba(255,255,255,0.05)"/>
    <polygon points="150,200 400,400 200,400" fill="rgba(255,255,255,0.1)"/>
    <polygon points="400,400 877,613 877,300" fill="rgba(255,255,255,0.08)"/>
    <polygon points="0,613 877,613 200,400" fill="rgba(255,255,255,0.12)"/>

    {/* Overlay gradient for subtle depth */}
    <rect width="100%" height="100%" fill="url(#vignette)" />
  </svg>
);

// Export the currently active background
export const ActiveBackground = BackgroundV2LowPoly;
