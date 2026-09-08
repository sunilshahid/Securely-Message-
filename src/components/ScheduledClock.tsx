import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";

export function ScheduledClock({ scheduledTime }: { scheduledTime: Date }) {
  const [isDone, setIsDone] = useState(false);
  const [initialDuration] = useState(() => Math.max(0, scheduledTime.getTime() - Date.now()));

  useEffect(() => {
     let ms = scheduledTime.getTime() - Date.now();
     if (ms <= 0) {
       setIsDone(true);
       return;
     }
     
     const timeout = setTimeout(() => {
       setIsDone(true);
     }, ms);
     return () => clearTimeout(timeout);
  }, [scheduledTime]);

  if (isDone) {
     return <Check className="w-3.5 h-3.5" />; // It looks Sent when time is up
  }

  return (
    <div className="relative w-3.5 h-3.5 flex items-center justify-center opacity-70" title="Scheduled message">
      <svg className="w-full h-full -rotate-90 text-indigo-400" viewBox="0 0 32 32">
        <circle
          cx="16" cy="16" r="14"
          fill="none" stroke="currentColor" strokeWidth="4"
          className="opacity-30"
        />
        <circle
          cx="16" cy="16" r="14"
          fill="none" stroke="currentColor" strokeWidth="4"
          strokeDasharray="88" strokeDashoffset="88"
          style={{
             animation: `schedule_countdown ${initialDuration / 1000}s linear forwards`
          }}
        />
      </svg>
      <style>{`
        @keyframes schedule_countdown {
          from {
            stroke-dashoffset: 88;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}
