import React from 'react'

export const Action = ({icon:Icon,label,onClick}:{icon:React.FC<React.SVGProps<SVGSVGElement>>,label:string,onClick:()=>void}) => (
  <button onClick={onClick} className="flex items-center gap-2">
    <span className="w-10 h-10 rounded-full border border-neutral-300 bg-white flex items-center justify-center shadow">
      <Icon width={18} height={18} />
    </span>
    <span className="text-sm text-neutral-600">{label}</span>
  </button>
)

export const PenIcon = (p:any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeWidth="2" d="M12 20h9" />
    <path strokeWidth="2" d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z" />
  </svg>
)

export const ArrowLrIcon = (p:any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeWidth="2" d="M7 7l-4 4 4 4" />
    <path strokeWidth="2" d="M17 7l4 4-4 4" />
    <path strokeWidth="2" d="M3 11h18M3 13h18" />
  </svg>
)

export const TrashIcon = (p:any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeWidth="2" d="M3 6h18" />
    <path strokeWidth="2" d="M8 6V4h8v2" />
    <path strokeWidth="2" d="M19 6l-1 14H6L5 6" />
  </svg>
)
