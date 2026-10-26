interface IconProps {
  size?: number;
  className?: string;
}

function base(size: number, className: string | undefined) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
}

export function BankIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M4 9.5h16" />
      <path d="M5.5 9.5V18M9.5 9.5V18M14.5 9.5V18M18.5 9.5V18" />
      <path d="M3 18.5h18M3 21h18" />
    </svg>
  );
}

export function LoginIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M14 4H6v16h8" />
      <path d="M10 12h11M18 8.5 21.5 12 18 15.5" />
    </svg>
  );
}

export function IdCardIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <circle cx="8.5" cy="11" r="2" />
      <path d="M5.5 16.5c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4" />
      <path d="M14 9.5h4.5M14 13h4.5" />
    </svg>
  );
}

export function LockIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="15.2" r="1.2" />
    </svg>
  );
}

export function KeyIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}

export function EyeIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 4l16 16" />
      <path d="M9.9 6c.7-.2 1.4-.3 2.1-.3 6 0 9.5 6.3 9.5 6.3a17 17 0 0 1-3.3 3.7M6 8.5A16 16 0 0 0 2.5 12S6 18.5 12 18.5c1.1 0 2.2-.2 3.1-.6" />
    </svg>
  );
}

export function InfoIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="7.8" r="0.4" fill="currentColor" />
    </svg>
  );
}

export function PhoneIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

export function MailIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </svg>
  );
}

export function ClockIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3.5 12h16M17 6.5 21.5 12 17 17.5" />
    </svg>
  );
}

export function PlusIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

export function CalendarIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M14.5 5 8 12l6.5 7" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M9.5 5 16 12l-6.5 7" />
    </svg>
  );
}

export function ChevronDownIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function BuildingIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" />
      <path d="M14 8h5a1 1 0 0 1 1 1v12M2.5 21h19" />
      <path d="M7 8h2M7 12h2M7 16h2M11 8h0M17 12h1M17 16h1" />
    </svg>
  );
}

export function UsersIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c.8-3.4 2.9-5 5.5-5s4.7 1.6 5.5 5" />
      <circle cx="16.5" cy="9" r="2.4" />
      <path d="M16 15.2c2.3.2 3.9 1.7 4.5 4.3" />
    </svg>
  );
}

export function PersonIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 20.5c1-3.8 3.4-5.7 6.5-5.7s5.5 1.9 6.5 5.7" />
    </svg>
  );
}

export function DoorIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17" />
      <path d="M2.5 21h19" />
      <circle cx="13" cy="12.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function TvIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M9 21h6" />
    </svg>
  );
}

export function SearchIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.8-3.8" />
    </svg>
  );
}

export function ClipboardCheckIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="5" y="4.5" width="14" height="17" rx="2" />
      <rect x="9" y="2.5" width="6" height="4" rx="1" />
      <path d="m10 14 2 2 4-4.5" />
    </svg>
  );
}

export function UserCheckIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="10" cy="8" r="3.4" />
      <path d="M3.5 20.5c1-3.8 3.4-5.7 6.5-5.7 1.4 0 2.7.4 3.7 1.1" />
      <path d="m15.5 18.5 2 2 4-4.5" />
    </svg>
  );
}

export function CheckCircleIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 5-5.5" />
    </svg>
  );
}

export function PinIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}

export function GlobeIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3Z" />
    </svg>
  );
}

export function HeadsetIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 13a8 8 0 0 1 16 0" />
      <rect x="3" y="12.5" width="4" height="7" rx="1.5" />
      <rect x="17" y="12.5" width="4" height="7" rx="1.5" />
      <path d="M19.5 19.5c-1 1.5-2.8 2-5 2" />
    </svg>
  );
}

export function CalendarPlusIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4M12 13v6M9 16h6" />
    </svg>
  );
}

export function DotsIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="8.5" cy="12" r="0.5" fill="currentColor" />
      <circle cx="12" cy="12" r="0.5" fill="currentColor" />
      <circle cx="15.5" cy="12" r="0.5" fill="currentColor" />
    </svg>
  );
}

export function LibraryIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 20V6a2 2 0 0 1 2-2h13v14H6a2 2 0 0 0-2 2Zm0 0a2 2 0 0 0 2 2h13" />
    </svg>
  );
}

export function AlertTriangleIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

export function FilterIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

export function ShieldCheckIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function WrenchIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

export function BellRingIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      <path d="M4 2C2.8 3.7 2 5.7 2 8M22 8c0-2.3-.8-4.3-2-6" />
    </svg>
  );
}

export function BanIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="10" />
      <path d="m4.9 4.9 14.2 14.2" />
    </svg>
  );
}

export function BookmarkIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function ClipboardListIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
    </svg>
  );
}

export function TagIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  );
}

export function BriefcaseIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

export function GraduationCapIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
    </svg>
  );
}

export function RefreshCwIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

export function HourglassIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 22h14" />
      <path d="M5 2h14" />
      <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
      <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
    </svg>
  );
}

export function CheckIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function XIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function ZapIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export function SlashIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}

export function CpuIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M15 2v2M9 2v2M20 15h2M20 9h2M15 20v2M9 20v2M2 15h2M2 9h2" />
    </svg>
  );
}

export function LogOutIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function DownloadIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function PencilIcon({ size = 15, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

export function TrashIcon({ size = 15, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function TableIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </svg>
  );
}

export function BarChartIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

export function FileTextIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

export function PlayIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TrophyIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

export function TrendingUpIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

export function PieChartIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}

export function ScaleIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </svg>
  );
}

export function TargetIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export function ChatIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function CopyIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}







