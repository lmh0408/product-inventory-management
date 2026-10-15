import React, { useEffect, useState } from 'react';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function formatElapsed(elapsedMs: number): string {
  const safeMs = Math.max(0, elapsedMs);
  if (safeMs < MINUTE_MS) return `${Math.floor(safeMs / 1000)}초 전`;
  if (safeMs < HOUR_MS) return `${Math.floor(safeMs / MINUTE_MS)}분 전`;
  if (safeMs < DAY_MS) return `${Math.floor(safeMs / HOUR_MS)}시간 전`;
  return `${Math.floor(safeMs / DAY_MS)}일 전`;
}

interface ElapsedTimeProps {
  since: number;
  className?: string;
}

export const ElapsedTime: React.FC<ElapsedTimeProps> = ({ since, className }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [since]);

  return (
    <time dateTime={new Date(since).toISOString()} className={className}>
      {formatElapsed(now - since)}
    </time>
  );
};
