/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CorrelationConfig } from '../types';
import { Sliders, Sun, ShieldAlert, Compass, Globe } from 'lucide-react';

interface FilterPanelProps {
  config: CorrelationConfig;
  onChange: (newConfig: CorrelationConfig) => void;
  loading: boolean;
  activeTab: 'forward' | 'backward' | 'scan';
  setActiveTab: (tab: 'forward' | 'backward' | 'scan') => void;
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  datasetBounds: { min: string; max: string };
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  config,
  onChange,
  loading,
  activeTab,
  setActiveTab,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  datasetBounds
}) => {
  const handleSliderChange = (key: keyof CorrelationConfig, val: number | string) => {
    onChange({
      ...config,
      [key]: val
    });
  };

  return (
    <div className="bg-black/40 border border-white/10 rounded-2xl p-5 space-y-6 shadow-xl text-xs font-mono h-full flex flex-col justify-between">
      <div className="space-y-6">
        {/* Research Mode Selection */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 block mb-3">Research Mode</label>
          <div className="space-y-2">
            <button
              onClick={() => setActiveTab('scan')}
              className={`w-full text-left px-4 py-3 rounded-lg border text-xs font-mono flex items-center justify-between cursor-pointer transition-all duration-200 ${
                activeTab === 'scan'
                  ? 'border-orange-500/50 bg-orange-500/10 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.15)] font-bold'
                  : 'border-white/5 bg-black/20 text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span>Auto Scan Stats</span>
              <span className="text-[10px] opacity-40">01</span>
            </button>
            <button
              onClick={() => setActiveTab('backward')}
              className={`w-full text-left px-4 py-3 rounded-lg border text-xs font-mono flex items-center justify-between cursor-pointer transition-all duration-200 ${
                activeTab === 'backward'
                  ? 'border-orange-500/50 bg-orange-500/10 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.15)] font-bold'
                  : 'border-white/5 bg-black/20 text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span>Backward Lookup</span>
              <span className="text-[10px] opacity-40">02</span>
            </button>
            <button
              onClick={() => setActiveTab('forward')}
              className={`w-full text-left px-4 py-3 rounded-lg border text-xs font-mono flex items-center justify-between cursor-pointer transition-all duration-200 ${
                activeTab === 'forward'
                  ? 'border-orange-500/50 bg-orange-500/10 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.15)] font-bold'
                  : 'border-white/5 bg-black/20 text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span>Forward Lookup</span>
              <span className="text-[10px] opacity-40">03</span>
            </button>
          </div>
        </div>

        {/* Sliders & Parameters Header */}
        <div className="border-t border-white/5 pt-4">
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 block mb-4">Parameters</label>
          
          <div className="space-y-4">
            {/* Temporal Window */}
            <div className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-2">
              <p className="text-[10px] text-white/60 mb-0.5">Time Window</p>
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold text-white">± {config.windowDays}.0 Days</span>
                <span className="text-[10px] text-orange-500">window</span>
              </div>
              <input
                type="range"
                min="1"
                max="14"
                value={config.windowDays}
                disabled={loading}
                onChange={(e) => handleSliderChange('windowDays', parseInt(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>

            {/* Earthquake Magnitude */}
            <div className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-2">
              <p className="text-[10px] text-white/60 mb-0.5">Seismic Threshold</p>
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold text-white">M {config.minEarthquakeMagnitude.toFixed(1)}+</span>
                <span className="text-[10px] text-orange-500">magnitude</span>
              </div>
              <input
                type="range"
                min="5.0"
                max="7.5"
                step="0.1"
                value={config.minEarthquakeMagnitude}
                disabled={loading}
                onChange={(e) => handleSliderChange('minEarthquakeMagnitude', parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Research Epoch Range (Date Range Selector) */}
        <div className="border-t border-white/5 pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-bold tracking-wider text-white/40 text-[10px] uppercase block">
              Research Epoch Range
            </span>
            {(startDate !== datasetBounds.min || endDate !== datasetBounds.max) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate(datasetBounds.min);
                  setEndDate(datasetBounds.max);
                }}
                className="text-[9px] text-orange-400 hover:text-orange-300 font-bold tracking-wider uppercase cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-slate-500 text-[9px] uppercase tracking-wider block">Start Date</label>
              <input
                type="date"
                min={datasetBounds.min}
                max={endDate || datasetBounds.max}
                value={startDate}
                disabled={loading || !datasetBounds.min}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-2.5 py-1.5 text-white/90 text-[10px] font-mono focus:outline-none focus:border-orange-500/50 transition-colors cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-500 text-[9px] uppercase tracking-wider block">End Date</label>
              <input
                type="date"
                min={startDate || datasetBounds.min}
                max={datasetBounds.max}
                value={endDate}
                disabled={loading || !datasetBounds.max}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-2.5 py-1.5 text-white/90 text-[10px] font-mono focus:outline-none focus:border-orange-500/50 transition-colors cursor-pointer"
              />
            </div>
          </div>
          {datasetBounds.min && (
            <div className="text-[9px] text-slate-500 font-sans leading-tight">
              Spans: <span className="font-mono text-[9px] text-slate-400">{datasetBounds.min}</span> to <span className="font-mono text-[9px] text-slate-400">{datasetBounds.max}</span>
            </div>
          )}
        </div>

        {/* Space Weather Filters */}
        <div className="border-t border-white/5 pt-4 space-y-3">
          <span className="font-bold tracking-wider text-white/40 text-[10px] uppercase block">
            Solar Loading Criteria
          </span>

          {/* Flare Class */}
          <div className="space-y-1.5">
            <label className="text-slate-400 text-[10px] block">Min Solar Flare Class</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['all', 'M', 'X'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSliderChange('minFlareClass', level)}
                  className={`py-1.5 rounded font-bold border transition-colors cursor-pointer text-center text-[10px] ${
                    config.minFlareClass === level
                      ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                      : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {level === 'all' ? 'All (B/C)' : `${level}-Class`}
                </button>
              ))}
            </div>
          </div>

          {/* CME Speed */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Min CME Speed</span>
              <span className="text-orange-400 font-bold">
                {config.minCmeSpeed === 0 ? 'All speeds' : `${config.minCmeSpeed} km/s`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1500"
              step="100"
              value={config.minCmeSpeed}
              disabled={loading}
              onChange={(e) => handleSliderChange('minCmeSpeed', parseInt(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>

          {/* Geomagnetic Storm Kp index */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Min Geomagnetic Kp Index</span>
              <span className="text-orange-400 font-bold">
                {config.minStormKp === 0 ? 'All levels' : `Kp ${config.minStormKp.toFixed(1)}`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="9"
              step="1"
              value={config.minStormKp}
              disabled={loading}
              onChange={(e) => handleSliderChange('minStormKp', parseInt(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>
        </div>

        {/* Geographic boundaries */}
        <div className="border-t border-white/5 pt-4 space-y-2">
          <span className="font-bold tracking-wider text-white/40 text-[10px] uppercase block">
            Seismic Location Focus
          </span>
          <div className="flex flex-col space-y-1.5">
            <label className="text-slate-400 flex items-center space-x-1 text-[10px]">
              <Compass className="w-3 h-3 text-orange-500" />
              <span>Geomagnetic Zone</span>
            </label>
            <div className="flex flex-col space-y-1">
              {(['all', 'saa', 'non-saa'] as const).map((region) => (
                <label
                  key={region}
                  className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer select-none transition-all duration-150 ${
                    config.insideSAAOnly === region
                      ? 'bg-orange-500/10 border-orange-500/40 text-orange-400'
                      : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="insideSAAOnly"
                    disabled={loading}
                    checked={config.insideSAAOnly === region}
                    onChange={() => handleSliderChange('insideSAAOnly', region)}
                    className="sr-only"
                  />
                  <Globe className={`w-3.5 h-3.5 ${config.insideSAAOnly === region ? 'text-orange-400' : 'text-slate-500'}`} />
                  <div className="text-[10px] leading-tight font-mono">
                    {region === 'all' && <div>All Planetary Coordinates</div>}
                    {region === 'saa' && (
                      <div>
                        <div className="font-bold text-orange-400">SAA Focus Area Only</div>
                        <div className="text-[9px] opacity-60">Lat: [-50,0], Lon: [-90,10]</div>
                      </div>
                    )}
                    {region === 'non-saa' && (
                      <div>
                        <div>Exclude SAA Zone</div>
                        <div className="text-[9px] opacity-60">Planetary baseline (stronger field)</div>
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SAA Bounding Coordinates panel & Radial Anomaly indicator */}
      <div className="space-y-4 border-t border-white/5 pt-4">
        <div className="w-full aspect-square border border-white/10 rounded-full flex items-center justify-center relative opacity-70">
          <div className="absolute w-full h-[1px] bg-white/10"></div>
          <div className="absolute h-full w-[1px] bg-white/10"></div>
          <div className={`w-1/2 h-1/2 rounded-full border transition-all duration-700 ${config.insideSAAOnly === 'saa' ? 'border-orange-500 bg-orange-500/5 animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'border-orange-500/20'}`}></div>
          <p className="absolute bottom-2 text-[8px] font-mono tracking-widest text-white/50">SAA REGION FOCUS</p>
        </div>

        <div className="text-[9px] text-white/40 leading-normal bg-black/40 p-2.5 rounded-lg border border-white/5">
          <p className="font-bold text-orange-400/80 mb-1 flex items-center space-x-1 uppercase tracking-wider">
            <span>ℹ️</span>
            <span>Research Protocol</span>
          </p>
          <p>
            SAA is Earth's weakest magnetic pocket, allowing deep solar particle penetration. Tectonic stress coupling triggers higher seismic hit rates here.
          </p>
        </div>
      </div>
    </div>
  );
};
