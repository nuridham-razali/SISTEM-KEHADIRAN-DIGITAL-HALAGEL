/**
 * ============================================================================
 * TETAPAN LATAR BELAKANG BASE64 (TAMPAL KOD BASE64 IMEJ ANDA DI BAWAH)
 * ============================================================================
 * Cara guna:
 * Gantikan nilai `RAW_BACKGROUND_BASE64` di bawah dengan kod Base64 imej anda.
 * Anda boleh tampal:
 * 1) Kod Base64 penuh bersama awalan: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
 * 2) Atau kod Base64 sahaja tanpa awalan: "/9j/4AAQSkZJRg..." (sistem akan tambah
 *    awalan data:image/jpeg;base64, secara automatik).
 */
export const RAW_BACKGROUND_BASE64: string = '';

/**
 * Fallback background gradient & architectural pattern used when RAW_BACKGROUND_BASE64 is empty.
 * Matches the sunlit Halagel building aesthetic in the design reference.
 */
const DEFAULT_FALLBACK_BACKGROUND =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <linearGradient id="skyGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="40%" stop-color="#7dd3fc"/>
      <stop offset="70%" stop-color="#bae6fd"/>
      <stop offset="100%" stop-color="#f0f9ff"/>
    </linearGradient>
    <linearGradient id="buildingGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="60%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
    <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0284c7" stop-opacity="0.7"/>
      <stop offset="50%" stop-color="#0369a1" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#075985" stop-opacity="0.95"/>
    </linearGradient>
    <linearGradient id="logoGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4d7c0f"/>
      <stop offset="100%" stop-color="#365314"/>
    </linearGradient>
  </defs>

  <!-- Sky & Clouds -->
  <rect width="1920" height="1080" fill="url(#skyGrad)"/>
  <ellipse cx="600" cy="180" rx="420" ry="90" fill="#ffffff" opacity="0.65" filter="blur(25px)"/>
  <ellipse cx="1100" cy="120" rx="550" ry="110" fill="#ffffff" opacity="0.75" filter="blur(30px)"/>
  <ellipse cx="1600" cy="200" rx="350" ry="80" fill="#ffffff" opacity="0.5" filter="blur(20px)"/>

  <!-- Main Corporate Building (Right side) -->
  <polygon points="1050,110 1920,80 1920,850 1050,850" fill="url(#buildingGrad)"/>
  
  <!-- Architectural Cornice / Top Parapet -->
  <polygon points="1040,90 1920,60 1920,130 1040,160" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="2"/>
  
  <!-- Halagel Wall Oval Signboard -->
  <ellipse cx="1400" cy="280" rx="190" ry="95" fill="url(#logoGrad)" stroke="#ffffff" stroke-width="10"/>
  <text x="1400" y="300" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="52" fill="#ffffff" text-anchor="middle" letter-spacing="4">HALAGEL</text>
  <circle cx="1560" cy="215" r="14" fill="#ffffff"/>
  <text x="1560" y="220" font-family="Arial, sans-serif" font-weight="bold" font-size="14" fill="#365314" text-anchor="middle">R</text>

  <!-- Glass Curtain Wall Windows -->
  <rect x="1100" y="390" width="780" height="230" fill="url(#glassGrad)"/>
  <g stroke="#ffffff" stroke-width="4" opacity="0.75">
    <line x1="1230" y1="390" x2="1230" y2="620"/>
    <line x1="1360" y1="390" x2="1360" y2="620"/>
    <line x1="1490" y1="390" x2="1490" y2="620"/>
    <line x1="1620" y1="390" x2="1620" y2="620"/>
    <line x1="1750" y1="390" x2="1750" y2="620"/>
    <line x1="1100" y1="505" x2="1880" y2="505"/>
  </g>

  <!-- Modern Entrance Canopy -->
  <polygon points="980,520 1850,470 1920,530 1020,580" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2"/>
  <rect x="1060" y="580" width="40" height="260" fill="#64748b"/>
  <rect x="1480" y="550" width="40" height="290" fill="#64748b"/>

  <!-- Glass Entrance Doors with Warm Light -->
  <rect x="1130" y="600" width="320" height="240" fill="#fef08a" opacity="0.35"/>
  <rect x="1130" y="600" width="320" height="240" fill="none" stroke="#475569" stroke-width="4"/>

  <!-- Forecourt Landscaping / Lush Foliage -->
  <ellipse cx="1400" cy="850" rx="550" ry="90" fill="#15803d"/>
  <ellipse cx="1150" cy="840" rx="200" ry="70" fill="#166534"/>
  <ellipse cx="1700" cy="850" rx="250" ry="80" fill="#14532d"/>

  <!-- Palm Fronds on Left & Right Margins -->
  <path d="M1920,0 Q1800,200 1700,450" stroke="#15803d" stroke-width="18" fill="none" opacity="0.6"/>
  <path d="M1920,80 Q1750,280 1620,520" stroke="#16a34a" stroke-width="14" fill="none" opacity="0.7"/>
  <path d="M1920,180 Q1780,350 1680,600" stroke="#22c55e" stroke-width="12" fill="none" opacity="0.6"/>

  <!-- Asphalt Roadway & Sun Highlights -->
  <polygon points="0,820 1920,780 1920,1080 0,1080" fill="#475569"/>
  <polygon points="400,880 1920,850 1920,1080 300,1080" fill="#334155"/>
  <ellipse cx="1200" cy="980" rx="900" ry="120" fill="#f8fafc" opacity="0.18" filter="blur(50px)"/>
</svg>
`);

/**
 * Returns clean Base64 URL format ready for CSS `background-image: url(...)` or `<img src="..." />`.
 */
export function getHalagelBackground(): string {
  // 1. Check if user configured or uploaded a base64 image locally in the browser
  if (typeof window !== 'undefined') {
    try {
      const localBg = localStorage.getItem('HALAGEL_CUSTOM_BG');
      if (localBg && localBg.trim()) {
        const trimmedLocal = localBg.trim();
        if (trimmedLocal.startsWith('data:')) return trimmedLocal;
        if (trimmedLocal.startsWith('/9j/')) return `data:image/jpeg;base64,${trimmedLocal}`;
        if (trimmedLocal.startsWith('iVBORw')) return `data:image/png;base64,${trimmedLocal}`;
        if (trimmedLocal.startsWith('UklGR')) return `data:image/webp;base64,${trimmedLocal}`;
        return `data:image/jpeg;base64,${trimmedLocal}`;
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  // 2. Check code constant in RAW_BACKGROUND_BASE64
  const trimmed = RAW_BACKGROUND_BASE64 ? RAW_BACKGROUND_BASE64.trim() : '';

  if (!trimmed) {
    return DEFAULT_FALLBACK_BACKGROUND;
  }

  // Already formatted with data:
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }

  // Detect mime type or default to jpeg/png
  if (trimmed.startsWith('/9j/')) {
    return `data:image/jpeg;base64,${trimmed}`;
  }
  if (trimmed.startsWith('iVBORw')) {
    return `data:image/png;base64,${trimmed}`;
  }
  if (trimmed.startsWith('R0lGOD')) {
    return `data:image/gif;base64,${trimmed}`;
  }
  if (trimmed.startsWith('UklGR')) {
    return `data:image/webp;base64,${trimmed}`;
  }

  return `data:image/jpeg;base64,${trimmed}`;
}

export const HALAGEL_BACKGROUND: string = getHalagelBackground();
