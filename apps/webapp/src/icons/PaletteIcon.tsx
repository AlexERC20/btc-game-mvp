import React from "react";
export default function PaletteIcon(props:{className?:string}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
         className={props.className}>
      <path d="M12 3a9 9 0 0 0 0 18c1.9 0 3-1.1 3-2.5S13.5 16 12 16a4 4 0 0 1-4-4"/>
      <circle cx="7.5" cy="10.5" r="1"/>
      <circle cx="10.5" cy="7.5" r="1"/>
      <circle cx="14" cy="9" r="1"/>
      <circle cx="16" cy="12" r="1"/>
    </svg>
  );
}
