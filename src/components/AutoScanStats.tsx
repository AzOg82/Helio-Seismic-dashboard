/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ScanStats, CorrelationConfig } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { ShieldAlert, BarChart3, TrendingUp, Compass, AlertCircle } from 'lucide-react';

interface AutoScanStatsProps {
  stats: ScanStats;
  config: CorrelationConfig;
}

export const AutoScanStats: React.FC<AutoScanStatsProps> = ({ stats, config }) => {
  if (stats.totalEarthquakesScanned === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-black/40 border border-white/10 rounded-2xl">
        <AlertCircle className="w-12 h-12 text-orange-500 mb-3 animate-pulse" />
        <h3 className="text-sm font-mono font-bold text-white">NO SCAN DATA GENERATED</h3>
        <p className="text-xs text-white/50 mt-1 max-w-sm text-center">
          No earthquakes matched the selected criteria (min magnitude M{config.minEarthquakeMagnitude}). Try lower magnitude limits or broader timeframes.
        </p>
      </div>
    );
  }

  // Format hit rate comparison data for Recharts
  const hitRateChartData = [
    {
      name: 'Any Precursor',
      'SAA (Weak Field)': parseFloat(stats.saaHitRates.any.toFixed(1)),
      'Non-SAA (Normal)': parseFloat(stats.nonSaaHitRates.any.toFixed(1))
    },
    {
      name: 'Flares',
      'SAA (Weak Field)': parseFloat(stats.saaHitRates.flare.toFixed(1)),
      'Non-SAA (Normal)': parseFloat(stats.nonSaaHitRates.flare.toFixed(1))
    },
    {
      name: 'CMEs',
      'SAA (Weak Field)': parseFloat(stats.saaHitRates.cme.toFixed(1)),
      'Non-SAA (Normal)': parseFloat(stats.nonSaaHitRates.cme.toFixed(1))
    },
    {
      name: 'HSS Arrivals',
      'SAA (Weak Field)': parseFloat(stats.saaHitRates.hss.toFixed(1)),
      'Non-SAA (Normal)': parseFloat(stats.nonSaaHitRates.hss.toFixed(1))
    },
    {
      name: 'Geo Storms',
      'SAA (Weak Field)': parseFloat(stats.saaHitRates.storm.toFixed(1)),
      'Non-SAA (Normal)': parseFloat(stats.nonSaaHitRates.storm.toFixed(1))
    }
  ];

  // Format lag distribution data for Recharts
  const lagChartData = stats.lagDistribution.map(bin => ({
    name: bin.label,
    'SAA (Weak)': bin.saaCount,
    'Non-SAA': bin.nonSaaCount
  }));

  const saaRatio = stats.saaCount / stats.totalEarthquakesScanned;
  const correlationIndex = (stats.saaHitRates.any - stats.nonSaaHitRates.any).toFixed(1);
  const isSaaHigher = stats.saaHitRates.any > stats.nonSaaHitRates.any;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-black/40 border border-white/10 rounded-2xl p-4 flex flex-col justify-between backdrop-blur-md">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono text-white/40 tracking-wider">TOTAL QUAKES SCANNED</span>
            <Compass className="w-4 h-4 text-white/30" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-mono font-bold text-white">{stats.totalEarthquakesScanned.toLocaleString()}</div>
            <p className="text-[10px] text-white/30 mt-0.5">
              M{config.minEarthquakeMagnitude.toFixed(1)}+ events analyzed
            </p>
          </div>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-2xl p-4 flex flex-col justify-between backdrop-blur-md">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono text-white/40 tracking-wider">SAA DISCHARGE RATES</span>
            <ShieldAlert className="w-4 h-4 text-orange-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-mono font-bold text-orange-500">
              {stats.saaCount.toLocaleString()}{' '}
              <span className="text-xs text-white/50">({(saaRatio * 100).toFixed(1)}%)</span>
            </div>
            <p className="text-[10px] text-white/30 mt-0.5">
              Earthquakes inside the SAA weak zone
            </p>
          </div>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-2xl p-4 flex flex-col justify-between backdrop-blur-md">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono text-white/40 tracking-wider">PRECURSOR HIT RATE</span>
            <BarChart3 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-mono font-bold text-cyan-400">
              {stats.hitRates.any.toFixed(1)}%
            </div>
            <p className="text-[10px] text-white/30 mt-0.5">
              EQs with preceding solar event in T-{config.windowDays}d
            </p>
          </div>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-2xl p-4 flex flex-col justify-between backdrop-blur-md">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono text-white/40 tracking-wider">ANOMALY CORRELATION INDEX</span>
            <TrendingUp className="w-4 h-4 text-orange-500 animate-pulse" />
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-mono font-bold ${isSaaHigher ? 'text-orange-500' : 'text-white/40'}`}>
              {isSaaHigher ? `+${correlationIndex}%` : `${correlationIndex}%`}
            </div>
            <p className="text-[10px] text-white/30 mt-0.5">
              SAA vs non-SAA hit-rate delta
            </p>
          </div>
        </div>
      </div>

      {/* Main Charts Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Precursor Hit Rates Chart */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-md backdrop-blur-md">
          <div className="mb-4">
            <h3 className="text-xs font-mono font-bold text-white tracking-wider uppercase">Precursor Hit-Rate Comparison</h3>
            <p className="text-[11px] text-white/40 mt-0.5">
              Percentage of EQs with at least one preceding solar precursor of specified type in T-{config.windowDays} days
            </p>
          </div>
          
          <div className="h-64 w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hitRateChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#111318" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" unit="%" domain={[0, 100]} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#0c0d12', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#ffffff' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="SAA (Weak Field)" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Non-SAA (Normal)" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Temporal Lag Distribution */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-md backdrop-blur-md">
          <div className="mb-4">
            <h3 className="text-xs font-mono font-bold text-white tracking-wider uppercase">Shortest Precursor Lag Distribution</h3>
            <p className="text-[11px] text-white/40 mt-0.5">
              How many hours prior to earthquake did the closest solar event occur
            </p>
          </div>

          <div className="h-64 w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lagChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#111318" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#0c0d12', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#ffffff' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="SAA (Weak)" fill="#f97316" stackId="a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Non-SAA" fill="#22d3ee" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Compound Sequences & Scientific Abstract */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compound Sequences */}
        <div className="lg:col-span-2 bg-black/40 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
          <h3 className="text-xs font-mono font-bold text-white tracking-wider uppercase mb-4">
            Compound Precursor Cascade Sequences
          </h3>
          <div className="space-y-4">
            {stats.compoundRates.map((seq, idx) => (
              <div key={idx} className="bg-black/60 border border-white/5 p-3.5 rounded-xl flex flex-col justify-between">
                <div className="flex justify-between items-center text-xs font-mono mb-2">
                  <span className="text-white font-semibold">{seq.name}</span>
                  <span className="text-white/40">
                    <strong className="text-orange-500 font-bold">{seq.count.toLocaleString()} EQs</strong> ({seq.rate.toFixed(1)}%)
                  </span>
                </div>
                {/* Horizontal Progress Bar */}
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-600 to-yellow-400 rounded-full transition-all duration-500"
                    style={{ width: `${seq.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scientific Review & Insights */}
        <div className="bg-gradient-to-br from-orange-950/10 to-black/80 border border-white/10 rounded-2xl p-5 flex flex-col justify-between backdrop-blur-md">
          <div>
            <h3 className="text-xs font-mono font-bold text-white tracking-wider uppercase mb-3">
              RESEARCH ANALYSIS ABSTRACT
            </h3>
            <div className="text-xs font-mono text-white/50 leading-relaxed space-y-2.5">
              <p>
                The underlying hypothesis evaluates whether geomagnetic fluctuations and flare energy injections act as a micro-structural <strong className="text-orange-400 font-bold">stress loading condition</strong> on tectonic plates near rupture thresholds.
              </p>
              <p>
                In the <strong className="text-white font-bold">South Atlantic Anomaly</strong>, Earth's protective magnetic field is structurally weaker, allowing deeper penetration of solar energetic particles.
              </p>
              {isSaaHigher ? (
                <p className="text-orange-400 border border-orange-500/20 bg-orange-500/10 p-2.5 rounded-lg">
                  <strong>Signature Verified:</strong> Precursor event hit rate is <strong className="font-bold underline">{correlationIndex}% higher</strong> inside the SAA region compared to normal regions. This is statistically compatible with the weak-field stress hypothesis.
                </p>
              ) : (
                <p className="text-white/60 border border-white/5 bg-white/5 p-2.5 rounded-lg">
                  <strong>Signature Inconclusive:</strong> Current filters show SAA delta at <strong className="font-bold">{correlationIndex}%</strong>. The data does not currently indicate a preferential discharge inside the weak-field anomaly for this magnitude range.
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-[10px] font-mono text-white/30 italic">
            Theoretical constraints: Correlation permitted, causation prohibited.
          </div>
        </div>
      </div>
    </div>
  );
};
