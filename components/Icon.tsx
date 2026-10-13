const P: Record<string, string> = {
  home: "M3 11.5 12 4l9 7.5M5 10v10h5v-6h4v6h5V10",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  wind: "M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  book: "M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Zm0 13a3 3 0 0 1 3-3h11",
  cal: "M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm-1 5h16M8 3v4M16 3v4",
  heart: "M12 20s-7-4.4-9-9.2C1.7 7.4 4 4 7.2 4c1.9 0 3.5 1 4.8 2.7C13.3 5 14.9 4 16.8 4 20 4 22.3 7.4 21 10.8 19 15.600 12 20 12 20Z",
  chat: "M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1Z",
  radio: "M12 12h.01M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.600 5.600a9 9 0 0 0 0 12.800M18.400 5.600a9 9 0 0 1 0 12.800",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.400-3a7.400 7.400 0 0 0-.1-1.300l2-1.600-2-3.400-2.400 1a7.600 7.600 0 0 0-2.200-1.300L14 3h-4l-.4 2.400a7.600 7.600 0 0 0-2.200 1.300l-2.400-1-2 3.400 2 1.600a7.400 7.400 0 0 0 0 2.600l-2 1.600 2 3.400 2.400-1a7.600 7.600 0 0 0 2.200 1.300L10 21h4l.4-2.400a7.600 7.600 0 0 0 2.200-1.300l2.400 1 2-3.400-2-1.600c.1-.4.100-.9.100-1.300Z",
  grid: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
  plus: "M12 5v14M5 12h14",
  check: "m5 12 5 5 9-10",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  print: "M7 9V3h10v6M7 17H4v-6h16v6h-3M7 14h10v7H7v-7Z",
  down: "M12 4v12m0 0 5-5m-5 5-5-5M5 20h14",
  up: "M12 20V8m0 0-5 5m5-5 5 5M5 4h14",
};

export default function Icon({ name, size = 20, className = "" }: { name: keyof typeof P | string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={P[name] ?? P.grid} />
    </svg>
  );
}
