import { HandSignDiagramKind } from '../data/jutsuCatalog';

export function KonohaLeafSymbol({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M25.5 22.5L28 24.5M23 19.5C23 23.09 19.87 26 16 26C11.58 26 8 22.42 8 18C8 12.8 12.2 8.5 17.5 8.5C21.37 8.5 24.5 11.41 24.5 15C24.5 18.04 22.04 20.5 19 20.5C16.51 20.5 14.5 18.49 14.5 16C14.5 13.93 16.18 12.25 18.25 12.25C19.91 12.25 21.25 13.59 21.25 15.25C21.25 16.49 20.24 17.5 19 17.5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.2 19.5L4 21.5L7.5 24"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HandSignDiagram({
  kind,
  accentColor = '#F97316',
}: {
  kind: HandSignDiagramKind;
  accentColor?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className="h-14 w-14 shrink-0"
    >
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="12"
        fill="#181614"
        stroke="rgba(245, 230, 200, 0.16)"
        strokeWidth="1.5"
      />

      {kind === 'hand-focus' && (
        <>
          <path
            d="M16 22V14H24M40 14H48V22M16 42V50H24M40 50H48V42"
            stroke={accentColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M27 42V29C27 27.6 28.1 26.5 29.5 26.5C30.9 26.5 32 27.6 32 29V24C32 22.6 33.1 21.5 34.5 21.5C35.9 21.5 37 22.6 37 24V29C37 27.9 37.9 27 39 27C40.1 27 41 27.9 41 29V38C41 42.4 37.4 46 33 46H29C25.7 46 23 43.3 23 40V34C23 32.9 23.9 32 25 32C26.1 32 27 32.9 27 34"
            stroke="#F5E6C8"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}

      {kind === 'open-palm' && (
        <>
          <circle
            cx="32"
            cy="37"
            r="9"
            fill={accentColor}
            fillOpacity="0.2"
            stroke={accentColor}
            strokeWidth="1.5"
            strokeDasharray="3 2"
          />
          <path
            d="M22 35L17 28M26 30L23 16M32 28V14M38 30L41 16M43 34L47 23"
            stroke="#F5E6C8"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M23 36C23 43 26.5 49 32.5 49C38.5 49 42 43.5 42 36"
            stroke="#F5E6C8"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}

      {kind === 'lightning-claw' && (
        <>
          <path
            d="M17 20L24 26L20 31M47 18L40 25L45 30"
            stroke={accentColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M23 44V32C23 29 25 27 27.5 27C29 27 30 28 30.5 29.5C31 27.5 33 26.5 35 27C36.5 27.4 37.5 28.5 38 30C39 28.5 41.5 28.5 42.5 30.5C43.2 31.8 43 34 43 36V42C43 46 39.5 49 35.5 49H28.5C25.5 49 23 46.8 23 44Z"
            stroke="#F5E6C8"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M27 35H39"
            stroke={accentColor}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      )}

      {kind === 'two-finger-seal' && (
        <>
          <path
            d="M29 31V15M35 31V15"
            stroke="#F5E6C8"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M24 38C24 34 26.5 31 30 31H36C39.5 31 41.5 33.5 41.5 37V41C41.5 45.5 38 49 33 49H30C26.5 49 24 46.2 24 42.5V38Z"
            stroke="#F5E6C8"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="14" r="2" fill={accentColor} />
        </>
      )}

      {kind === 'cross-seal' && (
        <>
          <path
            d="M27 16V44M33 16V44"
            stroke="#F5E6C8"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M18 32H46M18 38H46"
            stroke={accentColor}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <rect
            x="24"
            y="29"
            width="16"
            height="14"
            rx="4"
            fill="#181614"
            fillOpacity="0.65"
            stroke="#F5E6C8"
            strokeWidth="1.6"
          />
        </>
      )}
    </svg>
  );
}
