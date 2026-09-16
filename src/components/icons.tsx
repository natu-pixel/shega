import type { SVGProps } from "react";

export function ArrowIcon({ diagonal = false, ...props }: SVGProps<SVGSVGElement> & { diagonal?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h15m-6-6 6 6-6 6"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SparkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="32" height="32" viewBox="0 0 64 64" fill="none" aria-hidden="true" {...props}>
      <path d="m32 0 5.3 21.4L55 9 42.6 26.7 64 32l-21.4 5.3L55 55 37.3 42.6 32 64l-5.3-21.4L9 55l12.4-17.7L0 32l21.4-5.3L9 9l17.7 12.4L32 0Z" fill="currentColor" />
    </svg>
  );
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}
