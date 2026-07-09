/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UnifiedSolarEvent, Earthquake } from '../types';
import { Zap, Flame, Radio, ShieldAlert, Clock } from 'lucide-react';

interface PrecedingTimelineProps {
  earthquake: Earthquake;
  solarEvents: UnifiedSolarEvent[];
  windowDays: number;
}

export const PrecedingTimeline: React.FC<PrecedingTimelineProps> = ({
  earthquake,
  solarEvents,
  windowDays
}) => {
  const totalWindowMs = windowDays * 24 * 60 * 60 * 1000;
  const eqTime = earthquake.time;

  // Calculate coordinates along the timeline (0% to 100% width, where 100% is the Earthquake at time = 0)
  const getPercentage = (eventTime: number) => {
    const elapsed = eqTime - eventTime; // ms before earthquake
    const ratio = elapsed / totalWindowMs; // 0 (right at EQ) to 1 (at max window start)
    // We want 100% to be the EQ (on the right) and 0% to be the start of the window (on the left)
    return Math.max(0, Math.min(100, (1 - ratio) * 100));
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'flare':
        return <Flame className="w-3.5 h-3.5 text-orange-500" />;
      case 'cme':
        return <Radio className="w-3.5 h-3.5 text-purple-400" />;
      case 'hss':
        return <Zap className="w-3.5 h-3.5 text-teal-400" />;
      case 'storm':
        return <ShieldAlert className="w-3.5 h-3.5 text-red-500" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getEventColorClass = (type: string) => {
    switch (type) {
      case 'flare': return 'border-orange-500/40 bg-orange-950/80 text-orange-400';
      case 'cme': return 'border-purple-500/40 bg-purple-950/80 text-purple-300';
      case 'hss': return 'border-teal-500/40 bg-teal-950/80 text-teal-300';
      case 'storm': return 'border-red-500/40 bg-red-950/80 text-red-400';
      default: return 'border-white/10 bg-black/60 text-white/50';
    }
  };

  // Group events by time percentage so we don't pile them up at exactly the same spot
  // We'll staggered vertical levels (tracks)
  const staggeredEvents = React.useMemo(() => {
    const sorted = [...solarEvents].sort((a, b) => a.time - b.time);
    return sorted.map((event, idx) => {
      const hoursBefore = (eqTime - event.time) / (1000 * 60 * 60);
      return {
        ...event,
        hoursBefore,
        percentage: getPercentage(event.time),
        track: idx % 4 // 4 horizontal tracks to prevent overlapping
      };
    });
  }, [solarEvents, eqTime, windowDays]);

  return (
    <div className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 shadow-lg backdrop-blur-md">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h4 className="text-xs font-mono font-bold tracking-wider text-orange-500 uppercase">Precursor Temporal Profile</h4>
          <p className="text-[11px] text-white/40 mt-0.5">Chronology of solar loading conditions prior to seismic rupture</p>
        </div>
        <div className="flex space-x-2 text-[10px] font-mono">
          <span className="px-2 py-0.5 rounded bg-orange-950 text-orange-400 border border-orange-800/30">Flare</span>
          <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/30">CME</span>
          <span className="px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800/30">HSS</span>
          <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800/30">Storm</span>
        </div>
      </div>

      <div className="relative mt-8 mb-16 px-4">
        {/* Timeline Axis line */}
        <div className="absolute top-[32px] left-4 right-4 h-0.5 bg-white/5 flex justify-between">
          <div className="w-1.5 h-1.5 rounded-full bg-white/20 -translate-y-[2px]" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/20 -translate-y-[2px]" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/20 -translate-y-[2px]" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/20 -translate-y-[2px]" />
        </div>

        {/* Axis Ticks */}
        <div className="absolute top-[38px] left-4 right-4 flex justify-between text-[10px] font-mono text-white/30">
          <span>T-{windowDays} Days</span>
          <span>T-{Math.floor(windowDays / 2)} Days</span>
          <span>T-24 Hrs</span>
          <span className="text-orange-500 font-bold">Rupture (T-0)</span>
        </div>

        {/* Plotted Events */}
        <div className="relative h-24 mt-1">
          {staggeredEvents.map((event) => {
            // Track horizontal position and track vertical offset
            const xPos = `${event.percentage}%`;
            const yOffset = event.track * 20; // 0, 20, 40, 60px height

            return (
              <div
                key={event.id}
                className="absolute transition-all duration-300 group"
                style={{ left: xPos, top: `${yOffset}px` }}
              >
                {/* Connecting stem line */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 w-px border-l border-dashed border-white/15"
                  style={{
                    top: yOffset < 32 ? `${yOffset}px` : '32px',
                    height: `${Math.abs(32 - yOffset)}px`
                  }}
                />

                {/* Event Node */}
                <div
                  className={`relative -left-1/2 flex items-center space-x-1 px-1.5 py-0.5 rounded-full border text-[9px] font-mono cursor-default shadow-md transition-all duration-150 group-hover:scale-105 group-hover:z-30 ${getEventColorClass(event.type)}`}
                >
                  {getEventIcon(event.type)}
                  <span>
                    {event.type === 'flare' && event.label.split(' ')[0]}
                    {event.type === 'cme' && 'CME'}
                    {event.type === 'hss' && 'HSS'}
                    {event.type === 'storm' && 'Storm'}
                  </span>
                  <span className="text-white/40 font-normal">-{event.hoursBefore.toFixed(0)}h</span>
                  
                  {/* Tooltip detail */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col bg-[#0c0d12] border border-white/10 p-2.5 rounded-xl shadow-2xl w-48 text-[10px] z-50 text-white text-center leading-normal">
                    <p className="font-bold border-b border-white/5 pb-1 mb-1 text-white">{event.label}</p>
                    <p className="text-white/50 text-[9px] mb-1">{event.details}</p>
                    <p className="text-[9px] text-orange-400 font-mono font-bold">
                      Lag: {event.hoursBefore.toFixed(1)} hrs before EQ
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Rupture Target Marker */}
          <div className="absolute right-0 top-[22px] translate-x-1/2 flex flex-col items-center">
            <div className="w-5 h-5 rounded-full border-2 border-orange-500 bg-orange-950 flex items-center justify-center animate-pulse shadow-[0_0_10px_#f97316] z-10">
              <span className="text-[10px] font-bold text-orange-400">M</span>
            </div>
          </div>
        </div>
      </div>

      {solarEvents.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-white/10 rounded-xl text-white/30 text-xs font-mono">
          No qualifying space weather precursor events detected in this T-{windowDays} day window.
        </div>
      ) : (
        <div className="text-[11px] font-mono text-white/40 border-t border-white/10 pt-3 flex justify-between">
          <span>Correlated precursors: <strong className="text-white">{solarEvents.length} events</strong></span>
          <span className="text-white/30">Hover events for exact lag hours and active regions</span>
        </div>
      )}
    </div>
  );
};
