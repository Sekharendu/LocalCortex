import type { SVGProps } from "react";

// Inline stroke icons (24px grid), so there's no icon library to ship.
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

type P = SVGProps<SVGSVGElement>;

export const NewChatIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Icon>
);
export const MenuIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </Icon>
);
export const ArrowUpIcon = (p: P) => (
  <Icon strokeWidth="2.2" {...p}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </Icon>
);
export const ArrowDownIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </Icon>
);
export const StopIcon = (p: P) => (
  <Icon {...p}>
    <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none" />
  </Icon>
);
export const CopyIcon = (p: P) => (
  <Icon {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Icon>
);
export const CheckIcon = (p: P) => (
  <Icon {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
);
export const PencilIcon = (p: P) => (
  <Icon {...p}>
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Icon>
);
export const TrashIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </Icon>
);
export const FileIcon = (p: P) => (
  <Icon {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" />
  </Icon>
);
export const AlertIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4M12 16h.01" />
  </Icon>
);
export const RetryIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
    <path d="M3 21v-5h5" />
  </Icon>
);
export const CloseIcon = (p: P) => (
  <Icon {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
);
export const UploadIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 16V4M7 9l5-5 5 5" />
    <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </Icon>
);
export const LibraryIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z" />
    <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H19v-3" />
  </Icon>
);
