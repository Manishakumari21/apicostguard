import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "orbit"
  | "route"
  | "key"
  | "plug"
  | "cube"
  | "wallet"
  | "list"
  | "chart"
  | "gauge"
  | "shuffle"
  | "sliders"
  | "search"
  | "refresh"
  | "menu"
  | "close"
  | "arrow-right"
  | "arrow-up-right"
  | "arrow-down-right"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "chevron-up"
  | "sort"
  | "check"
  | "alert"
  | "info"
  | "copy"
  | "eye"
  | "eye-off"
  | "trash"
  | "plus"
  | "download"
  | "terminal"
  | "external"
  | "activity"
  | "clock"
  | "cpu"
  | "zap"
  | "lock"
  | "sparkles"
  | "server"
  | "shield"
  | "database"
  | "wifi"
  | "code"
  | "filter"
  | "dot"
  | "calendar"
  | "layers";

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
}

const paths: Record<IconName, ReactNode> = {
  orbit: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <ellipse cx="12" cy="12" rx="9" ry="4.3" transform="rotate(-28 12 12)" />
      <circle cx="20" cy="7.4" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  route: (
    <>
      <circle cx="5" cy="6" r="2.2" />
      <circle cx="19" cy="18" r="2.2" />
      <path d="M7.2 6h4.3a4 4 0 0 1 4 4v0a4 4 0 0 0 4 4h-2" />
      <path d="M5 8.2v2.3a3.5 3.5 0 0 0 3.5 3.5H12" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15.5" r="4" />
      <path d="m10.9 12.6 7.4-7.4a2 2 0 0 1 2.2-.4l.9.4.4.9a2 2 0 0 1-.4 2.2l-7.4 7.4" />
      <path d="m16 7 1.8 1.8M14 9l1.8 1.8" />
    </>
  ),
  plug: (
    <>
      <path d="M9 3v5M15 3v5" />
      <path d="M7 8h10v2.5a5 5 0 0 1-5 5v0a5 5 0 0 1-5-5V8Z" />
      <path d="M12 15.5V21" />
    </>
  ),
  cube: (
    <>
      <path d="m12 3 8 4.4v9.2L12 21l-8-4.4V7.4L12 3Z" />
      <path d="m4.3 7.6 7.7 4.3 7.7-4.3M12 12v8.8" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 17.5v-10Z" />
      <path d="M4 8h13.5A2.5 2.5 0 0 1 20 10.5V14h-4.5a2.5 2.5 0 0 1 0-5H20" />
      <circle cx="15.5" cy="11.5" r=".7" fill="currentColor" stroke="none" />
    </>
  ),
  list: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      <path d="m4 7 6-3 6 6 5-4" opacity=".45" />
    </>
  ),
  gauge: (
    <>
      <path d="M4.2 18a8 8 0 1 1 15.6 0" />
      <path d="M12 14.5 16 9" />
      <circle cx="12" cy="16" r="1.6" />
      <path d="M4 20h16" opacity=".4" />
    </>
  ),
  shuffle: (
    <>
      <path d="M3 7h3.4c4.4 0 5.8 10 10.2 10H21" />
      <path d="M3 17h3.4c1.4 0 2.6-1 3.6-2.4M14.2 9.4c1-1.4 2.1-2.4 3.4-2.4H21" />
      <path d="m18 4 3 3-3 3M18 14l3 3-3 3" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="m16 16 4.2 4.2" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 7v5h-5" />
      <path d="M4.7 10A7.5 7.5 0 0 1 18.5 6L20 7.5M4 17v-5h5" />
      <path d="M19.3 14A7.5 7.5 0 0 1 5.5 18L4 16.5" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  "arrow-right": <path d="M4 12h16m-6-6 6 6-6 6" />,
  "arrow-up-right": <path d="M7 17 17 7M8 7h9v9" />,
  "arrow-down-right": <path d="m7 7 10 10M8 17h9V8" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "chevron-left": <path d="m15 6-6 6 6 6" />,
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  "chevron-up": <path d="m6 15 6-6 6 6" />,
  sort: (
    <>
      <path d="m8 8 4-4 4 4M16 16l-4 4-4-4" />
    </>
  ),
  check: <path d="m5 12 4.4 4.4L19 6.5" />,
  alert: (
    <>
      <path d="M12 4 3 20h18L12 4Z" />
      <path d="M12 9v5" />
      <circle cx="12" cy="17" r=".8" fill="currentColor" stroke="none" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5" />
      <circle cx="12" cy="8" r=".8" fill="currentColor" stroke="none" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 5.5A2.5 2.5 0 0 0 13 3H6a2 2 0 0 0-2 2v9a2.5 2.5 0 0 0 2.5 2.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.8 12S6 5.8 12 5.8 21.2 12 21.2 12 18 18.2 12 18.2 2.8 12 2.8 12Z" />
      <circle cx="12" cy="12" r="2.7" />
    </>
  ),
  "eye-off": (
    <>
      <path d="M4 4l16 16" />
      <path d="M9.8 6.2A9.9 9.9 0 0 1 12 5.8c6 0 9.2 6.2 9.2 6.2a17 17 0 0 1-3 3.7M6.4 7.5a17 17 0 0 0-3.6 4.5S6 18.2 12 18.2a9.5 9.5 0 0 0 3.7-.8" />
      <path d="M10 10a2.7 2.7 0 0 0 3.8 3.8" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),
  plus: <path d="M12 4v16M4 12h16" />,
  download: (
    <>
      <path d="M12 3v12m-5-5 5 5 5-5" />
      <path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" />
    </>
  ),
  terminal: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <path d="m7.5 9 3 3-3 3M13 15h4" />
    </>
  ),
  external: (
    <>
      <path d="M13 5h6v6M19 5l-8 8" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </>
  ),
  activity: <path d="M2.5 12h4.2l2.4-6.4 5 13 2.4-6.6h5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.2 2" />
    </>
  ),
  cpu: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
    </>
  ),
  zap: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />,
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
      <circle cx="12" cy="15" r="1.1" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.5 5.2L19 10l-5.5 1.8L12 17l-1.5-5.2L5 10l5.5-1.8L12 3Z" />
      <path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />
    </>
  ),
  server: (
    <>
      <rect x="3" y="4" width="18" height="6" rx="1.8" />
      <rect x="3" y="14" width="18" height="6" rx="1.8" />
      <path d="M7 7h.1M7 17h.1" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.5 3.2 7.7 7.5 9.5 4.3-1.8 7.5-5 7.5-9.5V6L12 3Z" />
      <path d="m8.8 11.8 2.2 2.2 4.4-4.4" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5.5" rx="8" ry="3" />
      <path d="M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
      <path d="M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </>
  ),
  wifi: (
    <>
      <path d="M3 9a14 14 0 0 1 18 0M6 12.5a9 9 0 0 1 12 0M9 16a4.4 4.4 0 0 1 6 0" />
      <circle cx="12" cy="19" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  code: (
    <>
      <path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" />
    </>
  ),
  filter: (
    <>
      <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />
    </>
  ),
  dot: <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
    </>
  ),
};

export function Icon({ name, size = 16, strokeWidth = 1.6, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
