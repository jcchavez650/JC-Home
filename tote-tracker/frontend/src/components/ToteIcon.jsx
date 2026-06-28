import React from 'react';

export default function ToteIcon({ size = 28, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Yellow lid */}
      <rect x="4" y="6" width="24" height="6" rx="2" fill="#F5C400" />
      {/* Lid handle */}
      <rect x="13" y="3" width="6" height="4" rx="1.5" fill="#F5C400" />
      {/* Black tote body */}
      <rect x="5" y="12" width="22" height="15" rx="2" fill="#1a1a1a" />
      {/* Subtle body sheen */}
      <rect x="7" y="14" width="4" height="10" rx="1" fill="#2e2e2e" opacity="0.6" />
    </svg>
  );
}
