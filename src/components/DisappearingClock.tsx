import React from "react";

export function DisappearingClock({ expireIn }: { expireIn: number }) {
  return (
    <div className="relative w-3 h-3 flex items-center justify-center opacity-70" title="Disappearing message">
      <svg className="w-full h-full -rotate-90 text-current" viewBox="0 0 32 32">
        <circle
          cx="16" cy="16" r="14"
          fill="none" stroke="currentColor" strokeWidth="4"
          className="opacity-30"
        />
        <circle
          cx="16" cy="16" r="14"
          fill="none" stroke="currentColor" strokeWidth="4"
          strokeDasharray="88" strokeDashoffset="0"
          style={{
             animation: `countdown ${expireIn}s linear forwards`
          }}
        />
      </svg>
      <style>{`
        @keyframes countdown {
          to {
            stroke-dashoffset: 88;
          }
        }
      `}</style>
    </div>
  );
}
