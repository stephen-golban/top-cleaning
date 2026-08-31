import { cn } from "@/lib/cn";

/**
 * One drawn icon set, one stroke weight, one 16-unit grid — the deck's `.nav`
 * phone glyph is the reference. Nothing here is an emoji or a Unicode glyph
 * standing in for an icon, and no third-party brand logo is faked: WhatsApp and
 * Viber use the neutral chat mark and are named in text beside it.
 *
 * All icons are decorative by default (`aria-hidden`). The interactive element
 * that wraps them carries the accessible name.
 */

export type IconProps = {
  size?: number;
  className?: string;
};

type StrokeIconProps = IconProps & { children: React.ReactNode };

function StrokeIcon({ size = 16, className, children }: StrokeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("flex-none", className)}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M5.2 2H3.1a1.1 1.1 0 0 0-1.1 1.2c.2 2 .9 3.9 2 5.6a12 12 0 0 0 3.7 3.7c1.7 1.1 3.6 1.8 5.6 2a1.1 1.1 0 0 0 1.2-1.1v-2.1a1.1 1.1 0 0 0-.9-1.1 8 8 0 0 1-2-.5 1.1 1.1 0 0 0-1.1.2l-.9.9a11 11 0 0 1-4-4l.9-.9a1.1 1.1 0 0 0 .2-1.1 8 8 0 0 1-.5-2A1.1 1.1 0 0 0 5.2 2Z" />
    </StrokeIcon>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <rect x="1.8" y="3.3" width="12.4" height="9.4" rx="1.2" />
      <path d="m2.4 4.4 5 3.6a1 1 0 0 0 1.2 0l5-3.6" />
    </StrokeIcon>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M14 8.2A5.4 5.4 0 0 1 8.4 13.6a6 6 0 0 1-2.4-.5L2.4 14l1-3.4a5.2 5.2 0 0 1-.7-2.6A5.4 5.4 0 0 1 8.4 2.6 5.4 5.4 0 0 1 14 8Z" />
    </StrokeIcon>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M13 6.9c0 3.5-5 8-5 8s-5-4.5-5-8a5 5 0 0 1 10 0Z" />
      <circle cx="8" cy="6.8" r="1.8" />
    </StrokeIcon>
  );
}

export function MenuIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={(size * 12) / 18}
      viewBox="0 0 18 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      className={cn("flex-none", className)}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M1 2h16M1 10h16" />
    </svg>
  );
}

export function CloseIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      className={cn("flex-none", className)}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M2.8 8h10.4M9.4 4.2 13.2 8l-3.8 3.8" />
    </StrokeIcon>
  );
}
