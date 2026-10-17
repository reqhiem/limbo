import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconCopy = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5.5 5.5h8v8h-8z M2.5 10.5v-8h8" />
  </Icon>
);

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 8.5l3 3 7-7" />
  </Icon>
);

export const IconPause = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5.5 3v10 M10.5 3v10" />
  </Icon>
);

export const IconPlay = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 2.75v10.5L12.5 8z" />
  </Icon>
);

export const IconSliders = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2 4.5h7 M12.5 4.5H14 M9 2.75h3.5v3.5H9z M2 11.5h1.5 M7 11.5h7 M3.5 9.75H7v3.5H3.5z" />
  </Icon>
);

export const IconTrash = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 4.5h11 M6 4.5v-2h4v2 M4 4.5l.75 9h6.5l.75-9" />
  </Icon>
);

export const IconPlus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 2.5v11 M2.5 8h11" />
  </Icon>
);

export const IconSearch = (p: IconProps) => (
  <Icon {...p}>
    <path d="M11.25 7a4.25 4.25 0 1 1-8.5 0 4.25 4.25 0 0 1 8.5 0z M10.25 10.25l3.25 3.25" />
  </Icon>
);

export const IconDownload = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 2.5v8 M4.5 7l3.5 3.5L11.5 7 M2.5 13.5h11" />
  </Icon>
);

export const IconChevron = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 3.5l4.5 4.5L6 12.5" />
  </Icon>
);

export const IconClose = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 3.5l9 9 M12.5 3.5l-9 9" />
  </Icon>
);

export const IconTerminal = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 4l4 4-4 4 M8 12.5h5.5" />
  </Icon>
);

export const IconRetry = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13 8a5 5 0 1 1-1.46-3.54 M13 2.5v3h-3" />
  </Icon>
);
