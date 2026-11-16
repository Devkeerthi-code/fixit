/* One 24px grid, 1.5 stroke, drawn for FixIt. */
const PATHS = {
  bell: <><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15Z" /><path d="M10 20.5a2.2 2.2 0 0 0 4 0" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></>,
  moon: <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" />,
  camera: <><path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.4" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  alert: <><path d="M12 4 2.8 19.5h18.4Z" /><path d="M12 10v4.2" /><circle cx="12" cy="17" r=".5" /></>,
  arrow: <path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5" />,
  download: <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />,
  star: <path d="m12 3.8 2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8Z" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  pin: <><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></>,
  retry: <><path d="M19 12a7 7 0 1 1-2.1-5" /><path d="M19 4.5V8h-3.5" /></>,
  chev: <path d="m14.5 6-6 6 6 6" />,
  copy: <><rect x="8" y="8" width="11" height="11" /><path d="M5 15V5h10" /></>,
  user: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c1-4 4-5.5 7-5.5s6 1.5 7 5.5" /></>,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "ico" }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}
