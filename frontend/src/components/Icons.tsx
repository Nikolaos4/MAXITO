import type { SVGProps } from "react";

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, ...p,
});

export const PlusCircleIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9.5" /><path d="M12 7.5v9M7.5 12h9" /></svg>
);
export const ListIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="4.5" y="3.5" width="15" height="17" rx="1.5" /><path d="M8 8h8M8 12h8M8 16h8" /></svg>
);
export const InfoIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3 3.5 9.5V20.5h17V9.5z" /><path d="M12 11v5.5M12 8.3v.2" /></svg>
);
export const HomeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 11 12 4l8 7M6 9.5V20h12V9.5" /><path d="M10 20v-5h4v5" /></svg>
);
export const DoorIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 20V4h12v16M4 20h16" /><path d="M14.5 12v.2" /></svg>
);
export const UserIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.6-3.8 3.4-5.5 7-5.5s6.4 1.7 7 5.5" /></svg>
);
export const CommentIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 5h11v8H9l-3 3v-3H4z" /><path d="M18 9h2v8h-2v3l-3-3h-5v-2" /></svg>
);
export const HeartIcon = ({ filled, ...p }: SVGProps<SVGSVGElement> & { filled?: boolean }) => (
  <svg {...base(p)} fill={filled ? "currentColor" : "none"}>
    <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />
  </svg>
);
export const ChevronIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m6 9 6 6 6-6" /></svg>
);
export const CloseIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m7 7 10 10M17 7 7 17" /></svg>
);
export const CalendarIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="4" y="5.5" width="16" height="14" rx="2" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></svg>
);
export const ClockIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
export const ArrowLeftIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M15 5 8 12l7 7" /></svg>
);
export const ArchiveIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3.5" y="4" width="17" height="4.5" rx="1" /><path d="M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5M12 11v5m-2.5-2.2L12 16.3l2.5-2.5" /></svg>
);
export const BuildingIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="5" y="3.5" width="14" height="17" rx="1.5" /><path d="M8.5 7.5h.01M12 7.5h.01M15.5 7.5h.01M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M15.5 14.5h.01" strokeLinecap="round" /><path d="M10 20.5v-4h4v4" /></svg>
);

/** Два дома с окнами — для карточки «О доме» */
export const StatBuildingIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} strokeWidth={1.5}>
    <rect x="2" y="9" width="7.5" height="12" rx="1" />
    <rect x="10.5" y="3" width="11.5" height="18" rx="1.2" />
    {[11.7, 14.7, 17.7].map((y) => (
      <g key={y}>
        <path d={`M3.7 ${y}h.01`} strokeLinecap="round" strokeWidth={2} />
        <path d={`M6.8 ${y}h.01`} strokeLinecap="round" strokeWidth={2} />
      </g>
    ))}
    {[5.7, 8.7, 11.7, 14.7, 17.7].map((y) => (
      <g key={y}>
        <path d={`M13.2 ${y}h.01`} strokeLinecap="round" strokeWidth={2} />
        <path d={`M19.3 ${y}h.01`} strokeLinecap="round" strokeWidth={2} />
      </g>
    ))}
  </svg>
);

/** Дверь с ручкой — для карточки «О доме» */
export const StatDoorIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} strokeWidth={1.5}>
    <path d="M5 21h14" />
    <path d="M7.5 21V5a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 16.5 5v16" />
    <path d="M13.3 13h.01" strokeLinecap="round" strokeWidth={2.4} />
  </svg>
);
