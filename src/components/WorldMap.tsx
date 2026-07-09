/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Earthquake } from '../types';
import { isInsideSAA, SAA_BOUNDS } from '../utils';

interface WorldMapProps {
  earthquakes: Earthquake[];
  selectedEarthquake?: Earthquake | null;
  onSelectEarthquake?: (eq: Earthquake) => void;
  highlightSAA?: boolean;
}

export const WorldMap: React.FC<WorldMapProps> = ({
  earthquakes,
  selectedEarthquake,
  onSelectEarthquake,
  highlightSAA = true
}) => {
  const width = 800;
  const height = 400;

  // Convert lat/lon to SVG coordinate space (Plate Carrée Equirectangular)
  const getCoords = (lat: number, lon: number) => {
    const x = ((lon + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return { x, y };
  };

  // Pre-calculate SAA rectangle dimensions
  const saaCoords = useMemo(() => {
    const topLeft = getCoords(SAA_BOUNDS.maxLat, SAA_BOUNDS.minLon);
    const bottomRight = getCoords(SAA_BOUNDS.minLat, SAA_BOUNDS.maxLon);
    return {
      x: topLeft.x,
      y: topLeft.y,
      w: bottomRight.x - topLeft.x,
      h: bottomRight.y - topLeft.y
    };
  }, []);

  // Generate grid lines
  const gridLines = useMemo(() => {
    const lines = [];
    // Longitude lines (vertical)
    for (let lon = -150; lon <= 150; lon += 30) {
      const { x } = getCoords(0, lon);
      lines.push({ x1: x, y1: 0, x2: x, y2: height, label: `${lon}°` });
    }
    // Latitude lines (horizontal)
    for (let lat = -60; lat <= 60; lat += 30) {
      const { y } = getCoords(lat, 0);
      lines.push({ x1: 0, y1: y, x2: width, y2: y, label: `${lat}°` });
    }
    return lines;
  }, []);

  // Prime meridian and equator coordinates
  const equatorY = getCoords(0, 0).y;
  const primeMeridianX = getCoords(0, 0).x;

  return (
    <div className="relative w-full bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-4 backdrop-blur-md">
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_#f97316]"></span>
          <span className="text-xs font-mono text-white/70 tracking-wider">GEO-SPATIAL FAULT PROJECTION</span>
        </div>
        <div className="flex space-x-4 text-[10px] font-mono text-white/50">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 bg-orange-500/20 border border-orange-500 rounded"></span>
            <span>SAA Zone</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            <span>M5.0+ Epicenter</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 bg-orange-500 rounded-full border border-white"></span>
            <span>Selected Event</span>
          </div>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[600px] select-none text-white/30 font-mono text-[9px]"
        >
          {/* Background Grid Fill */}
          <rect width={width} height={height} fill="#050608" />

          {/* Reference Outline & Technical Dots */}
          <rect width={width} height={height} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={2} />

          {/* Major Grid Lines */}
          {gridLines.map((line, idx) => (
            <g key={idx}>
              <line
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#111318"
                strokeWidth={1}
                strokeDasharray={line.label ? "2,4" : "0"}
              />
              {/* Labels on the outer bounds */}
              {line.x1 !== undefined && line.y1 === 0 && (
                <text x={line.x1} y={height - 6} textAnchor="middle" fill="rgba(255, 255, 255, 0.3)">
                  {line.label}
                </text>
              )}
              {line.y1 !== undefined && line.x1 === 0 && (
                <text x={6} y={line.y1 + 3} textAnchor="start" fill="rgba(255, 255, 255, 0.3)">
                  {line.label}
                </text>
              )}
            </g>
          ))}

          {/* Primary Coordinates Axis */}
          <line x1={0} y1={equatorY} x2={width} y2={equatorY} stroke="rgba(255,255,255,0.08)" strokeWidth={1.5} />
          <line x1={primeMeridianX} y1={0} x2={primeMeridianX} y2={height} stroke="rgba(255,255,255,0.08)" strokeWidth={1.5} />
          
          <text x={width - 50} y={equatorY - 4} fill="rgba(255, 255, 255, 0.4)" className="font-bold">EQUATOR</text>
          <text x={primeMeridianX + 5} y={15} fill="rgba(255, 255, 255, 0.4)" className="font-bold">MERIDIAN</text>

          {/* South Atlantic Anomaly bounding box */}
          {highlightSAA && (
            <g>
              <rect
                x={saaCoords.x}
                y={saaCoords.y}
                width={saaCoords.w}
                height={saaCoords.h}
                fill="url(#saaGradient)"
                stroke="#f97316"
                strokeWidth={1.5}
                strokeDasharray="4,3"
                className="transition-all duration-300"
              />
              {/* SAA Bounding text */}
              <text
                x={saaCoords.x + 8}
                y={saaCoords.y + 16}
                fill="#f97316"
                className="font-bold text-[10px]"
              >
                SOUTH ATLANTIC ANOMALY (SAA)
              </text>
            </g>
          )}

          {/* Plot Earthquakes */}
          {earthquakes.map((eq, idx) => {
            const { x, y } = getCoords(eq.lat, eq.lon);
            const isSelected = selectedEarthquake?.time === eq.time;
            const size = (eq.mag - 4.5) * 4 + 3; // Scaling radius
            const isSaaEvent = isInsideSAA(eq.lat, eq.lon);

            // Color scale based on depth (red for shallow, orange for medium, blue/cyan for deep)
            let color = '#ef4444'; // Red shallow < 70km
            if (eq.depth >= 70 && eq.depth < 300) {
              color = '#f97316'; // Orange medium 70-300km
            } else if (eq.depth >= 300) {
              color = '#06b6d4'; // Cyan deep > 300km
            }

            return (
              <g key={idx} className="cursor-pointer group" onClick={() => onSelectEarthquake?.(eq)}>
                {/* Hover ring */}
                <circle
                  cx={x}
                  cy={y}
                  r={size + 5}
                  fill="none"
                  stroke={color}
                  strokeWidth={1}
                  className="opacity-0 group-hover:opacity-40 transition-opacity"
                />
                {/* Pulse wave animation if selected */}
                {isSelected && (
                  <circle
                    cx={x}
                    cy={y}
                    r={size + 12}
                    fill="none"
                    stroke="#f97316"
                    strokeWidth={1.5}
                    className="animate-ping"
                    style={{ transformOrigin: `${x}px ${y}px` }}
                  />
                )}
                {/* Main dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? size + 2 : size}
                  fill={isSelected ? '#f97316' : color}
                  stroke={isSelected ? '#ffffff' : 'none'}
                  strokeWidth={isSelected ? 1.5 : 0}
                  className="opacity-80 group-hover:opacity-100 transition-opacity"
                />
              </g>
            );
          })}

          {/* Gradients and Filters Definitions */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#111318" strokeWidth="0.5" />
            </pattern>
            <linearGradient id="saaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ea580c" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.22" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap justify-between items-center text-[10px] font-mono text-white/40 gap-2">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>Shallow (&lt;70km)</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            <span>Medium (70–300km)</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
            <span>Deep (&gt;300km)</span>
          </div>
        </div>
        <div className="text-white/30">
          Showing {earthquakes.length} earthquakes · Coordinate Projection: Equirectangular Plate Carrée
        </div>
      </div>
    </div>
  );
};
