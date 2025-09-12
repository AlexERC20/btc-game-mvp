import * as React from 'react';

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

const Base: React.FC<IconProps & { children: React.ReactNode }> = ({
  size = 24, children, ...p
}) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" {...p}
  >
    {children}
  </svg>
);

// Toolbar
export const IconTemplate = (p:IconProps) => (
  <Base {...p}>
    <rect x="3" y="3" width="7" height="7" rx="2"/>
    <rect x="14" y="3" width="7" height="7" rx="2"/>
    <rect x="3" y="14" width="7" height="7" rx="2"/>
    <rect x="14" y="14" width="7" height="7" rx="2"/>
  </Base>
);

export const IconLayout  = (p:IconProps) => (
  <Base {...p}>
    <rect x="3" y="4" width="18" height="16" rx="3"/>
    <path d="M3 12h18"/>
  </Base>
);

export const IconFonts   = (p:IconProps) => (
  <Base {...p}>
    <path d="M4 18h6M7 18L12 6h2l5 12"/>
    <path d="M10 14h6"/>
  </Base>
);

export const IconPhotos  = (p:IconProps) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="14" rx="3"/>
    <path d="M9 9h.01"/>
    <path d="M3 15l4-4 3 3 4-4 5 5"/>
  </Base>
);

export const IconInfo    = (p:IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 8h.01"/>
    <path d="M11 12h2v5h-2z"/>
  </Base>
);

export const PlusIcon = (p:IconProps) => (
  <Base {...p}>
    <path d="M12 5v14"/>
    <path d="M5 12h14"/>
  </Base>
);

export const CheckIcon = (p:IconProps) => (
  <Base {...p}>
    <path d="M5 13l4 4L19 7"/>
  </Base>
);

// Swipe actions
export const IconTrash   = (p:IconProps) => (
  <Base {...p}>
    <path d="M3 6h18"/>
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    <rect x="6" y="6" width="12" height="14" rx="2"/>
    <path d="M10 11v6M14 11v6"/>
  </Base>
);

export const IconMoveUp  = (p:IconProps) => (
  <Base {...p}><path d="M12 19V5"/><path d="M7 10l5-5 5 5"/></Base>
);
export const IconMoveDown= (p:IconProps) => (
  <Base {...p}><path d="M12 5v14"/><path d="M17 14l-5 5-5-5"/></Base>
);
export const IconGrip    = (p:IconProps) => (
  <Base {...p}>
    <circle cx="9" cy="7" r="1"/><circle cx="15" cy="7" r="1"/>
    <circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>
    <circle cx="9" cy="17" r="1"/><circle cx="15" cy="17" r="1"/>
  </Base>
);

// Mode toggle
export const IconStory   = (p:IconProps) => (
  <Base {...p}><rect x="4" y="3" width="16" height="18" rx="4"/><path d="M8 7h8M8 12h8M8 17h5"/></Base>
);
export const IconCarousel= (p:IconProps) => (
  <Base {...p}>
    <rect x="2" y="6" width="6" height="12" rx="2"/>
    <rect x="9" y="3" width="6" height="18" rx="2"/>
    <rect x="16" y="6" width="6" height="12" rx="2"/>
  </Base>
);

// Overlay indicator (optional)
export const IconOverlay = (p:IconProps) => (
  <Base {...p}><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 15h18" opacity=".6"/><path d="M3 17h18" opacity=".3"/></Base>
);

export default {
  IconTemplate,
  IconLayout,
  IconFonts,
  IconPhotos,
  IconInfo,
  PlusIcon,
  CheckIcon,
  IconTrash,
  IconMoveUp,
  IconMoveDown,
  IconGrip,
  IconStory,
  IconCarousel,
  IconOverlay,
};
