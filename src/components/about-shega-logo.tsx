import { ShegaLogo } from "./shega-logo";

export function AboutShegaLogo() {
  return (
    <div className="about-art">
      <svg className="about-shega-logo" viewBox="0 0 180 180" aria-hidden="true" focusable="false">
        <ellipse className="shega-logo-orbit" cx="90" cy="90" rx="78" ry="67" transform="rotate(-28 90 90)" />
        <ellipse className="shega-logo-orbit" cx="90" cy="90" rx="85" ry="46" transform="rotate(24 90 90)" />
        <circle className="shega-logo-orbit-dot" cx="167.65" cy="124.57" r="1.3" />
        <g transform="translate(25 48)">
          <ShegaLogo />
        </g>
      </svg>
      <span className="about-coordinate" aria-hidden="true">THE BEST<br />AND BEYOND.</span>
    </div>
  );
}
