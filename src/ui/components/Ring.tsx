/** Reading progress as a ring: empty, partial in amber, or a finished check. */
export const Ring = ({ progress, done }: { progress: number; done: boolean }) => {
  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <svg className={`ring ${done ? "is-done" : ""}`} width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <circle className="ring-track" cx="11" cy="11" r={radius} fill="none" strokeWidth="1.5" />
      {done ? (
        <path className="ring-check" d="M7 11.2l2.8 2.8L15.4 8.4" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <circle
          className="ring-fill"
          cx="11"
          cy="11"
          r={radius}
          fill="none"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeDasharray={`${circumference * clamped} ${circumference}`}
          transform="rotate(-90 11 11)"
        />
      )}
    </svg>
  );
};
