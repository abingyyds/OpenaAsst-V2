interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Rounded square background */}
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#d97757" />
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#logoGrad)" />

      {/* Terminal prompt >_ */}
      <path
        d="M16 22L28 32L16 42"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 42H48"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* Gradient definition */}
      <defs>
        <linearGradient id="logoGrad" x1="2" y1="2" x2="62" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e8956f" stopOpacity="0.4" />
          <stop offset="1" stopColor="#c2613f" stopOpacity="0.3" />
        </linearGradient>
      </defs>
    </svg>
  );
}
