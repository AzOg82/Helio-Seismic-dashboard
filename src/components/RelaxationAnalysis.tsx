/**
 * Relaxation Analysis Panel
 * New mode for analyzing solar-seismic lag correlations
 */

import React, { useState } from 'react';
import { runSolarSeismicSearch } from '../lib/dataFetcher';
import { analyzeRelaxationTiming, getCorrelationStats } from '../lib/relaxationAnalyzer';

export function RelaxationAnalysis() {
  const [mode, setMode] = useState<'PAST_TWO_YEARS' | 'DATE_RANGE' | 'GLOBAL_18_YEAR'>('PAST_TWO_YEARS');
  const [windowHours, setWindowHours] = useState(72);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleAnalyze() {
    setLoading(true);
    setError('');
    setResults(null);

    try {
      const { solar, seismic } = await runSolarSeismicSearch(mode, {
        startDate,
        endDate
      });

      const correlations = analyzeRelaxationTiming(solar, seismic, windowHours);
      const stats = getCorrelationStats(correlations);

      setResults({
        correlations,
        stats
      });
    } catch (err: any) {
      setError(err.message || 'Failed to run analysis');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '20px', background: '#0a1628', borderRadius: '6px', border: '1px solid #152540', marginBottom: '18px' }}>
      <h2 style={{ color: '#8b5cf6', marginBottom: '16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        ▸ Relaxation Timing Analysis
      </h2>

      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as any)}
          style={{
            padding: '8px 12px',
            background: '#07090d',
            color: '#b8ccd8',
            border: '1px solid #152540',
            borderRadius: '4px',
            fontFamily: 'monospace'
          }}
        >
          <option value="PAST_TWO_YEARS">Last 2 Years</option>
          <option value="DATE_RANGE">Custom Date Range</option>
          <option value="GLOBAL_18_YEAR">Last 18 Years</option>
        </select>

        {mode === 'DATE_RANGE' && (
          <>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: '8px 12px',
                background: '#07090d',
                color: '#b8ccd8',
                border: '1px solid #152540',
                borderRadius: '4px',
                fontFamily: 'monospace'
              }}
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: '8px 12px',
                background: '#07090d',
                color: '#b8ccd8',
                border: '1px solid #152540',
                borderRadius: '4px',
                fontFamily: 'monospace'
              }}
            />
          </>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4a6070', fontSize: '11px' }}>
          Window (hrs):
          <input
            type="number"
            value={windowHours}
            onChange={(e) => setWindowHours(parseInt(e.target.value))}
            min="1"
            max="168"
            style={{
              width: '50px',
              padding: '6px',
              background: '#07090d',
              color: '#b8ccd8',
              border: '1px solid #152540',
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}
          />
        </label>

        <button
          onClick={handleAnalyze}
          disabled={loading}
          style={{
            padding: '8px 20px',
            background: '#8b5cf6',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            fontSize: '11px',
            letterSpacing: '0.1em'
          }}
        >
          {loading ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px', background: '#1c0808', border: '1px solid #e05050', borderRadius: '4px', color: '#e05050', marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {results && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '18px' }}>
            <div style={{ background: '#0d1e35', padding: '12px', borderRadius: '4px', border: '1px solid #152540' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6' }}>{results.stats.totalPairs}</div>
              <div style={{ fontSize: '9px', color: '#4a6070', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>
                Total Pairs
              </div>
            </div>
            <div style={{ background: '#0d1e35', padding: '12px', borderRadius: '4px', border: '1px solid #152540' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#c44880' }}>{results.stats.saaPairs}</div>
              <div style={{ fontSize: '9px', color: '#4a6070', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>
                SAA Region
              </div>
            </div>
            <div style={{ background: '#0d1e35', padding: '12px', borderRadius: '4px', border: '1px solid #152540' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#38c4d4' }}>{results.stats.averageLatencyHours.toFixed(1)}</div>
              <div style={{ fontSize: '9px', color: '#4a6070', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>
                Avg Latency (hrs)
              </div>
            </div>
            <div style={{ background: '#0d1e35', padding: '12px', borderRadius: '4px', border: '1px solid #152540' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e8a020' }}>{results.stats.maxMagnitude.toFixed(1)}</div>
              <div style={{ fontSize: '9px', color: '#4a6070', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>
                Max Magnitude
              </div>
            </div>
          </div>

          <div style={{ background: '#0d1e35', padding: '12px', borderRadius: '4px', border: '1px solid #152540' }}>
            <div style={{ fontSize: '10px', color: '#4a6070', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Event Type Distribution
            </div>
            {Object.entries(results.stats.eventTypeCounts).map(([type, count]) => (
              <div key={type} style={{ fontSize: '12px', color: '#b8ccd8', marginBottom: '4px' }}>
                {type}: {count}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
