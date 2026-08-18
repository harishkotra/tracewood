import React, { useEffect, useMemo } from 'react';
import { useForestStore } from '../store/forestStore.js';
import { Play, Pause, RotateCcw, FastForward, Clock, Sparkles } from 'lucide-react';

export const TimelineScrubber: React.FC = () => {
  const {
    sessions,
    timelineDate,
    timelineMinDate,
    timelineMaxDate,
    isPlayingTimeline,
    timelineSpeed,
    setTimelineDate,
    togglePlayTimeline,
    setTimelineSpeed,
    stepTimeline
  } = useForestStore();

  // Playback timer effect
  useEffect(() => {
    if (!isPlayingTimeline) return;
    const intervalMs = Math.max(100, 1000 / timelineSpeed);
    const timer = setInterval(() => {
      stepTimeline();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlayingTimeline, timelineSpeed, stepTimeline]);

  // Total session count up to current timeline date
  const activeStats = useMemo(() => {
    if (!timelineMinDate || !timelineMaxDate) return { count: 0, date: '' };
    const targetDate = timelineDate || timelineMaxDate;

    let count = 0;
    Object.values(sessions).forEach((sList: any) => {
      sList.forEach((s: any) => {
        if (s.startedAt && s.startedAt.split('T')[0] <= targetDate) {
          count++;
        }
      });
    });

    return { count, date: targetDate };
  }, [sessions, timelineDate, timelineMinDate, timelineMaxDate]);

  if (!timelineMinDate || !timelineMaxDate || timelineMinDate === timelineMaxDate) {
    return null;
  }

  // Convert date strings to timestamps for continuous slider
  const minTime = new Date(timelineMinDate).getTime();
  const maxTime = new Date(timelineMaxDate).getTime();
  const currentTime = new Date(timelineDate || timelineMaxDate).getTime();

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const dateStr = new Date(val).toISOString().split('T')[0];
    setTimelineDate(dateStr);
  };

  const formatDateDisplay = (dStr: string) => {
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dStr;
    }
  };

  const isPresent = !timelineDate || timelineDate === timelineMaxDate;

  return (
    <div className="glass-panel px-4 py-2.5 rounded-xl border border-forest-moss/30 shadow-2xl flex items-center gap-4 text-forest-sage pointer-events-auto max-w-2xl w-full mx-auto animate-fade-in backdrop-blur-md">
      
      {/* 1. Play / Pause Control */}
      <button
        onClick={togglePlayTimeline}
        className={`p-2 rounded-lg border transition-all ${
          isPlayingTimeline
            ? 'bg-forest-fern text-forest-glow border-forest-leaf shadow-md'
            : 'bg-black/40 hover:bg-forest-moss/60 border-forest-moss/30 text-forest-sage hover:text-forest-glow'
        }`}
        title={isPlayingTimeline ? "Pause timeline" : "Play chronological growth"}
      >
        {isPlayingTimeline ? <Pause size={13} /> : <Play size={13} />}
      </button>

      {/* 2. Speed selector */}
      <div className="flex items-center gap-1 bg-black/30 p-1 rounded-lg border border-forest-moss/20">
        {[1, 2, 5].map((spd) => (
          <button
            key={spd}
            onClick={() => setTimelineSpeed(spd)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-all ${
              timelineSpeed === spd
                ? 'bg-forest-moss text-forest-glow font-bold'
                : 'text-forest-leaf/70 hover:text-forest-sage'
            }`}
          >
            {spd}x
          </button>
        ))}
      </div>

      {/* 3. Interactive Range Slider */}
      <div className="flex-grow flex flex-col gap-1">
        <div className="flex justify-between items-center text-[10px] font-mono">
          <span className="text-forest-leaf flex items-center gap-1">
            <Clock size={10} />
            {formatDateDisplay(timelineMinDate)}
          </span>
          
          <div className="flex items-center gap-1.5">
            <span className="text-forest-gold font-semibold flex items-center gap-1">
              <Sparkles size={10} />
              {formatDateDisplay(activeStats.date)}
            </span>
            <span className="text-forest-leaf">({activeStats.count} sessions)</span>
          </div>

          <span className="text-forest-leaf">
            {formatDateDisplay(timelineMaxDate)}
          </span>
        </div>

        <input
          type="range"
          min={minTime}
          max={maxTime}
          step={86400000} // 1 day step
          value={currentTime}
          onChange={handleSliderChange}
          className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-forest-fern border border-forest-moss/20"
        />
      </div>

      {/* 4. Reset to Present */}
      {!isPresent && (
        <button
          onClick={() => setTimelineDate(null)}
          className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1.5 bg-forest-moss/50 hover:bg-forest-moss text-forest-glow border border-forest-leaf/30 rounded-lg transition-all"
          title="Jump to Present Day"
        >
          <RotateCcw size={11} />
          Now
        </button>
      )}

    </div>
  );
};
