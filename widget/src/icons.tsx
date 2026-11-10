// Inline icons; nothing loads from a third party (D53).
type P = { size?: number };

const base = (size = 18) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 1.8,
  'stroke-linecap': 'round' as const,
  'stroke-linejoin': 'round' as const,
  'aria-hidden': true,
  focusable: 'false',
});

export const SendIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M5 12h13M13 6l6 6-6 6" />
  </svg>
);
export const CloseIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const ChevronDownIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
export const ArrowUpIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);
export const ExpandIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
  </svg>
);
export const EndIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M14 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2M10 12h11M18 9l3 3-3 3" />
  </svg>
);
export const CheckIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
export const PhoneIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </svg>
);
export const CalendarIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);
export const ExternalIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </svg>
);
export const SparkleIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
  </svg>
);
export const ClockIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
export const AlertIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M12 4l9 16H3l9-16zM12 10v4M12 17.2v.1" />
  </svg>
);
export const DownloadIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />
  </svg>
);
export const PinIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.3" />
  </svg>
);
export const BagIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M5 8h14l-1.2 12H6.2L5 8zM9 8V6.5a3 3 0 0 1 6 0V8" />
  </svg>
);
export const FormIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20zM14 3.5V8h4M9.5 12h5M9.5 15.5h5" />
  </svg>
);
export const ReceiptIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M6 3.5h12v17l-2.5-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 20.5zM9 8h6M9 11.5h6M9 15h3.5" />
  </svg>
);
export const ChartIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M4 20h16M7 16v-5M12 16V7M17 16v-8" />
  </svg>
);
export const StarIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4 7.2 18.9l.9-5.4-3.9-3.8 5.4-.8z" />
  </svg>
);
export const LockIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </svg>
);
export const ChatIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-5 4v-4.5A2.5 2.5 0 0 1 4 14.5z" />
  </svg>
);
export const ThumbUpIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M7 10v11" />
    <path d="M15 5.9L14 10h5.6a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 18.4 21H7V10l4.3-7.4A2.2 2.2 0 0 1 15 5.9z" />
  </svg>
);
export const ThumbDownIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M17 14V3" />
    <path d="M9 18.1L10 14H4.4a2 2 0 0 1-2-2.3l1.2-7A2 2 0 0 1 5.6 3H17v11l-4.3 7.4A2.2 2.2 0 0 1 9 18.1z" />
  </svg>
);
