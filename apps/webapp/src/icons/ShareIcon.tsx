import * as React from 'react';

export default function ShareIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" {...props}>
      <path d="M12 3v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 7l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
