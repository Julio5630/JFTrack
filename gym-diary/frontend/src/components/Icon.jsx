const icons = {
  home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10.5V20h5v-5h4v5h5v-9.5" /></>,
  dumbbell: <><path d="M6 7v10" /><path d="M18 7v10" /><path d="M3 9v6" /><path d="M21 9v6" /><path d="M6 12h12" /></>,
  pencil: <><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" /><path d="m14 7 3 3" /></>,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4" /><path d="M16 3v4" /><path d="M4 10h16" /></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5Z" /><path d="M4 17.5A2.5 2.5 0 0 0 6.5 15H20" /></>,
  history: <><path d="M4 7v5h5" /><path d="M5.5 12A7 7 0 1 0 8 6.7L4 12" /><path d="M12 8v5l3 2" /></>,
  chart: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="M8 16v-5" /><path d="M12 16V8" /><path d="M16 16v-8" /></>,
  shield: <><path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6Z" /><path d="m9 12 2 2 4-4" /></>,
  logout: <><path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" /><path d="M15 8l4 4-4 4" /><path d="M19 12H9" /></>,
  settings: <><path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" /><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2.1 3.6-.2-.1a1.8 1.8 0 0 0-2 .4l-.1.1h-7l-.1-.1a1.8 1.8 0 0 0-2-.4l-.2.1-2.1-3.6.1-.1a1.8 1.8 0 0 0 .4-2 1.8 1.8 0 0 0-1.6-1.1H3v-4h.1A1.8 1.8 0 0 0 4.7 9a1.8 1.8 0 0 0-.4-2l-.1-.1 2.1-3.6.2.1a1.8 1.8 0 0 0 2-.4l.1-.1h7l.1.1a1.8 1.8 0 0 0 2 .4l.2-.1 2.1 3.6-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.6 1.1h.1v4h-.1a1.8 1.8 0 0 0-1.7 1Z" /></>,
  userPlus: <><path d="M15 20a6 6 0 0 0-12 0" /><circle cx="9" cy="8" r="4" /><path d="M19 8v6" /><path d="M16 11h6" /></>,
  clipboard: <><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4a3 3 0 0 1 6 0" /><path d="M9 10h6" /><path d="M9 14h6" /></>,
  trash: <><path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M6 7l1 14h10l1-14" /><path d="M9 7V4h6v3" /></>,
  flame: <><path d="M12 21c-4 0-7-3-7-7 0-3 2-5.5 4-7.5.4 2.4 2 3.4 3.2 4.3 1.4-1.8 1.5-4.2.8-6.8 3 2 6 5.1 6 10 0 4-3 7-7 7Z" /><path d="M12 21c-1.7 0-3-1.2-3-3 0-1.5 1-2.6 2-3.5.2 1.1 1 1.7 1.6 2.1.7-.9.8-2 .4-3.4 1.5 1 3 2.6 3 4.8 0 1.8-1.3 3-4 3Z" /></>,
  bolt: <path d="m13 2-8 12h6l-1 8 8-12h-6Z" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></>,
  edit: <><path d="M12 20h9" /><path d="m16.5 3.5 4 4L8 20H4v-4Z" /></>,
  close: <><path d="M6 6l12 12" /><path d="M18 6 6 18" /></>,
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  chevronUp: <path d="m18 15-6-6-6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  check: <path d="m5 12 4 4 10-10" />,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0Z" /><path d="M8 6H5a3 3 0 0 0 3 5" /><path d="M16 6h3a3 3 0 0 1-3 5" /><path d="M12 13v4" /><path d="M9 21h6" /><path d="M10 17h4" /></>,
  alert: <><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" /></>,
  gymLogo: <><path d="M5 8v8" /><path d="M19 8v8" /><path d="M2.5 10v4" /><path d="M21.5 10v4" /><path d="M5 12h14" /><path d="M8 5.5 12 3l4 2.5" /><path d="M8 18.5 12 21l4-2.5" /></>,
};

export default function Icon({ name, className = '', title, size = 20 }) {
  return (
    <svg
      className={`animated-icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {icons[name] || icons.alert}
    </svg>
  );
}
