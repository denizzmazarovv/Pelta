/** Знак Pelta Nera — четыре лепестка. */
export function Mark({ size = 24, className = '' }: { size?: number; className?: string }) {
  const petal = 'M50 49 C30 50 14 40 11 11 C40 14 50 30 51 50 Z';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      {[0, 90, 180, 270].map((r) => (
        <path key={r} d={petal} transform={`rotate(${r} 50 50)`} />
      ))}
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display font-normal tracking-[0.01em] leading-none whitespace-nowrap ${className}`}>
      Pelta Nera
    </span>
  );
}
