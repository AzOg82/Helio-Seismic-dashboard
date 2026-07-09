/**
 * Relaxation Timing Analysis Engine
 * Detects time-lag correlations between solar events and seismic response
 */

import type { SolarEvent, SeismicEvent } from './dataFetcher';

export interface CorrelationResult {
  solarTimestamp: number;
  solarEventType: string;
  seismicTimestamp: number;
  magnitude: number;
  latencyHours: number;
  isInsideSAA: boolean;
  place?: string;
}

/**
 * SAA (South Atlantic Anomaly) bounding box
 * Region where Earth's magnetic field is weakest
 */
const SAA_BOUNDS = {
  latMin: -50,
  latMax: 5,
  lonMin: -90,
  lonMax: 40
};

function isInSAA(lat: number, lon: number): boolean {
  return (
    lat >= SAA_BOUNDS.latMin &&
    lat <= SAA_BOUNDS.latMax &&
    lon >= SAA_BOUNDS.lonMin &&
    lon <= SAA_BOUNDS.lonMax
  );
}

/**
 * Core Analysis Engine: Processes datasets to calculate time-lag correlation
 * Finds solar events followed by seismic triggers within a relaxation window
 *
 * @param solarData - Array of solar events (CME, HSS, flares, storms)
 * @param seismicData - Array of earthquake events
 * @param windowHours - Time window to search after solar event (default 72 hours)
 * @returns Array of correlated solar-seismic pairs
 */
export function analyzeRelaxationTiming(
  solarData: SolarEvent[],
  seismicData: SeismicEvent[],
  windowHours: number = 72
): CorrelationResult[] {
  const correlationResults: CorrelationResult[] = [];

  // Filter for solar events that can trigger stress: CMEs, HSS, and Bz flip events
  const triggerEvents = solarData.filter(
    (event) =>
      event.type === 'CME' ||
      event.type === 'HSS' ||
      event.type === 'GST' ||
      event.bz_flip === true
  );

  const windowMs = windowHours * 60 * 60 * 1000;

  triggerEvents.forEach((solarEvent) => {
    const solarTime = typeof solarEvent.timestamp === 'string'
      ? new Date(solarEvent.timestamp).getTime()
      : solarEvent.timestamp;

    // Find seismic events that occurred AFTER the solar trigger
    const correspondingEarthquakes = seismicData.filter((earthquake) => {
      const seismicTime = typeof earthquake.timestamp === 'string'
        ? new Date(earthquake.timestamp).getTime()
        : earthquake.timestamp;

      const timeDiffMs = seismicTime - solarTime;
      const timeDiffHours = timeDiffMs / (60 * 60 * 1000);

      // Check if it falls within the relaxation window and in SAA region
      const isInWindow = timeDiffHours > 0 && timeDiffHours <= windowHours;
      const inSAARegion = isInSAA(earthquake.latitude, earthquake.longitude);

      return isInWindow;
    });

    correspondingEarthquakes.forEach((eq) => {
      const seismicTime = typeof eq.timestamp === 'string'
        ? new Date(eq.timestamp).getTime()
        : eq.timestamp;

      const latencyHours = (seismicTime - solarTime) / (60 * 60 * 1000);
      const inSAA = isInSAA(eq.latitude, eq.longitude);

      correlationResults.push({
        solarTimestamp: solarTime,
        solarEventType: solarEvent.type,
        seismicTimestamp: seismicTime,
        magnitude: eq.magnitude,
        latencyHours: parseFloat(latencyHours.toFixed(2)),
        isInsideSAA: inSAA,
        place: (eq as any).place || ''
      });
    });
  });

  return correlationResults;
}

/**
 * Statistical Summary of Correlations
 */
export interface CorrelationStats {
  totalPairs: number;
  saaPairs: number;
  nonSaaPairs: number;
  averageLatencyHours: number;
  medianLatencyHours: number;
  maxMagnitude: number;
  eventTypeCounts: Record<string, number>;
}

export function getCorrelationStats(results: CorrelationResult[]): CorrelationStats {
  if (results.length === 0) {
    return {
      totalPairs: 0,
      saaPairs: 0,
      nonSaaPairs: 0,
      averageLatencyHours: 0,
      medianLatencyHours: 0,
      maxMagnitude: 0,
      eventTypeCounts: {}
    };
  }

  const saaPairs = results.filter((r) => r.isInsideSAA).length;
  const latencies = results.map((r) => r.latencyHours).sort((a, b) => a - b);

  const eventTypeCounts: Record<string, number> = {};
  results.forEach((r) => {
    eventTypeCounts[r.solarEventType] = (eventTypeCounts[r.solarEventType] || 0) + 1;
  });

  return {
    totalPairs: results.length,
    saaPairs,
    nonSaaPairs: results.length - saaPairs,
    averageLatencyHours: results.reduce((sum, r) => sum + r.latencyHours, 0) / results.length,
    medianLatencyHours: latencies[Math.floor(latencies.length / 2)],
    maxMagnitude: Math.max(...results.map((r) => r.magnitude)),
    eventTypeCounts
  };
}
