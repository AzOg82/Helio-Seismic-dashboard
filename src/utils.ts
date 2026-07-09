/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SolarFlare,
  CME,
  HSS,
  GeomagneticStorm,
  Earthquake,
  UnifiedSolarEvent,
  CorrelationConfig,
  BackwardCorrelationResult,
  ForwardCorrelationResult,
  ScanStats
} from './types';

// South Atlantic Anomaly (SAA) Bounding Box coordinates
export const SAA_BOUNDS = {
  minLat: -50,
  maxLat: 0,
  minLon: -90,
  maxLon: 10
};

/**
 * Checks if a coordinate is inside the South Atlantic Anomaly region
 */
export function isInsideSAA(lat: number, lon: number): boolean {
  return (
    lat >= SAA_BOUNDS.minLat &&
    lat <= SAA_BOUNDS.maxLat &&
    lon >= SAA_BOUNDS.minLon &&
    lon <= SAA_BOUNDS.maxLon
  );
}

/**
 * Helper to parse solar flare class rating into a numeric scale
 * B7.4 -> 0.074
 * C1.5 -> 1.5
 * M2.0 -> 20.0
 * X1.2 -> 120.0
 */
export function parseFlareMagnitude(classType: string): number {
  if (!classType) return 0;
  const prefix = classType[0].toUpperCase();
  const valStr = classType.slice(1);
  const val = parseFloat(valStr) || 1.0;
  
  switch (prefix) {
    case 'X': return 100 + val;
    case 'M': return 10 + val;
    case 'C': return 1 + val * 0.1;
    case 'B': return val * 0.01;
    default: return val * 0.001;
  }
}

/**
 * Format a raw DONKI flare into a UnifiedSolarEvent
 */
export function formatFlare(flare: SolarFlare): UnifiedSolarEvent {
  const time = new Date(flare.beginTime).getTime();
  return {
    id: flare.flrID || `flare-${time}`,
    type: 'flare',
    time,
    originalTimeStr: flare.beginTime,
    label: `${flare.classType} Solar Flare`,
    details: `Active Region: ${flare.activeRegionNum || 'Unknown'}${flare.sourceLocation ? `, Location: ${flare.sourceLocation}` : ''}`,
    magnitude: parseFlareMagnitude(flare.classType),
    raw: flare
  };
}

/**
 * Format a raw DONKI CME into a UnifiedSolarEvent
 */
export function formatCME(cme: CME): UnifiedSolarEvent {
  const time = new Date(cme.startTime).getTime();
  
  // Find speed from analysis
  let speed = 0;
  if (cme.cmeAnalyses && cme.cmeAnalyses.length > 0) {
    const mostAccurate = cme.cmeAnalyses.find(a => a.isMostAccurate);
    const analysis = mostAccurate || cme.cmeAnalyses[0];
    speed = analysis.speed || 0;
  }
  
  return {
    id: cme.activityID || `cme-${time}`,
    type: 'cme',
    time,
    originalTimeStr: cme.startTime,
    label: `CME${speed > 0 ? ` (${speed} km/s)` : ''}`,
    details: `Source: ${cme.sourceLocation || 'Unknown'}${speed > 0 ? `, Expansion Speed: ${speed} km/s` : ''}`,
    magnitude: speed,
    raw: cme
  };
}

/**
 * Format a raw DONKI HSS into a UnifiedSolarEvent
 */
export function formatHSS(hss: HSS): UnifiedSolarEvent {
  const time = new Date(hss.eventTime).getTime();
  return {
    id: hss.hssID || `hss-${time}`,
    type: 'hss',
    time,
    originalTimeStr: hss.eventTime,
    label: 'HSS Arrival',
    details: `High-Speed Stream arrival detected via Solar Wind sensors.`,
    magnitude: 1.0,
    raw: hss
  };
}

/**
 * Format a raw DONKI Storm into a UnifiedSolarEvent
 */
export function formatStorm(storm: GeomagneticStorm): UnifiedSolarEvent {
  const time = new Date(storm.startTime).getTime();
  
  // Find max Kp Index
  let kpMax = 5.0; // Default threshold for storm
  if (storm.allKpIndex && storm.allKpIndex.length > 0) {
    kpMax = Math.max(...storm.allKpIndex.map(k => k.kpIndex));
  }
  
  return {
    id: storm.gstID || `storm-${time}`,
    type: 'storm',
    time,
    originalTimeStr: storm.startTime,
    label: `Geomagnetic Storm (Kp ${kpMax.toFixed(1)})`,
    details: `Max Kp-index: ${kpMax.toFixed(1)} recorded during event.`,
    magnitude: kpMax,
    raw: storm
  };
}

/**
 * Filter unified solar events based on config
 */
export function filterSolarEvents(events: UnifiedSolarEvent[], config: CorrelationConfig): UnifiedSolarEvent[] {
  return events.filter(e => {
    if (e.type === 'flare') {
      if (config.minFlareClass === 'X' && e.magnitude < 100) return false;
      if (config.minFlareClass === 'M' && e.magnitude < 10) return false;
    } else if (e.type === 'cme') {
      if (config.minCmeSpeed > 0 && e.magnitude < config.minCmeSpeed) return false;
    } else if (e.type === 'storm') {
      if (config.minStormKp > 0 && e.magnitude < config.minStormKp) return false;
    }
    return true;
  });
}

/**
 * Filter earthquakes based on config
 */
export function filterEarthquakes(quakes: Earthquake[], config: CorrelationConfig): Earthquake[] {
  return quakes.filter(q => {
    if (q.mag < config.minEarthquakeMagnitude) return false;
    
    const inside = isInsideSAA(q.lat, q.lon);
    if (config.insideSAAOnly === 'saa' && !inside) return false;
    if (config.insideSAAOnly === 'non-saa' && inside) return false;
    
    return true;
  });
}

/**
 * Forward Lookup - Find earthquakes following a solar event
 */
export function runForwardLookup(
  solarEvent: UnifiedSolarEvent,
  earthquakes: Earthquake[],
  config: CorrelationConfig
): ForwardCorrelationResult {
  const windowMs = config.windowDays * 24 * 60 * 60 * 1000;
  const startTime = solarEvent.time;
  const endTime = startTime + windowMs;
  
  // Filter qualifying earthquakes in the time window
  const filteredQuakes = filterEarthquakes(earthquakes, config).filter(
    q => q.time >= startTime && q.time <= endTime
  );
  
  // Sort by time ascending
  filteredQuakes.sort((a, b) => a.time - b.time);
  
  return {
    solarEvent,
    followingEarthquakes: filteredQuakes,
    totalCount: filteredQuakes.length
  };
}

/**
 * Backward Lookup - Find solar events preceding an earthquake
 */
export function runBackwardLookup(
  earthquake: Earthquake,
  solarEvents: UnifiedSolarEvent[],
  config: CorrelationConfig
): BackwardCorrelationResult {
  const windowMs = config.windowDays * 24 * 60 * 60 * 1000;
  const endTime = earthquake.time;
  const startTime = endTime - windowMs;
  
  // Filter qualifying solar events in the time window
  const filteredSolar = filterSolarEvents(solarEvents, config).filter(
    e => e.time >= startTime && e.time <= endTime
  );
  
  // Sort by time descending (closest to the earthquake first)
  filteredSolar.sort((a, b) => b.time - a.time);
  
  return {
    earthquake,
    precedingSolarEvents: filteredSolar,
    hasFlare: filteredSolar.some(e => e.type === 'flare'),
    hasCme: filteredSolar.some(e => e.type === 'cme'),
    hasHss: filteredSolar.some(e => e.type === 'hss'),
    hasStorm: filteredSolar.some(e => e.type === 'storm'),
    isSAA: isInsideSAA(earthquake.lat, earthquake.lon)
  };
}

/**
 * Auto Scan - Scan all earthquakes to find statistical hit rates
 */
export function runAutoScan(
  earthquakes: Earthquake[],
  solarEvents: UnifiedSolarEvent[],
  config: CorrelationConfig
): ScanStats {
  // 1. Filter qualifying earthquakes
  const qualifyingQuakes = filterEarthquakes(earthquakes, config);
  const total = qualifyingQuakes.length;
  
  if (total === 0) {
    return {
      totalEarthquakesScanned: 0,
      saaCount: 0,
      nonSaaCount: 0,
      hitRates: { any: 0, flare: 0, cme: 0, hss: 0, storm: 0 },
      saaHitRates: { any: 0, flare: 0, cme: 0, hss: 0, storm: 0 },
      nonSaaHitRates: { any: 0, flare: 0, cme: 0, hss: 0, storm: 0 },
      lagDistribution: [],
      compoundRates: []
    };
  }
  
  // Pre-filter solar events to speed up processing
  const eligibleSolar = filterSolarEvents(solarEvents, config);
  
  // Sort solar events by time ascending for fast binary search or sliding index
  eligibleSolar.sort((a, b) => a.time - b.time);
  
  const windowMs = config.windowDays * 24 * 60 * 60 * 1000;
  
  let saaTotal = 0;
  let nonSaaTotal = 0;
  
  let hitAny = 0;
  let hitFlare = 0;
  let hitCme = 0;
  let hitHss = 0;
  let hitStorm = 0;
  
  let saaHitAny = 0;
  let saaHitFlare = 0;
  let saaHitCme = 0;
  let saaHitHss = 0;
  let saaHitStorm = 0;
  
  let nonSaaHitAny = 0;
  let nonSaaHitFlare = 0;
  let nonSaaHitCme = 0;
  let nonSaaHitHss = 0;
  let nonSaaHitStorm = 0;
  
  // Lag bins: 0-12h, 12-24h, 24-48h, 48-72h, 72-120h, 120-168h (up to 7 days)
  const lagBins = [
    { label: '0 – 12 hrs', maxHours: 12, count: 0, saaCount: 0, nonSaaCount: 0 },
    { label: '12 – 24 hrs', maxHours: 24, count: 0, saaCount: 0, nonSaaCount: 0 },
    { label: '24 – 48 hrs', maxHours: 48, count: 0, saaCount: 0, nonSaaCount: 0 },
    { label: '48 – 72 hrs', maxHours: 72, count: 0, saaCount: 0, nonSaaCount: 0 },
    { label: '72 – 120 hrs', maxHours: 120, count: 0, saaCount: 0, nonSaaCount: 0 },
    { label: '120 – 168 hrs', maxHours: 168, count: 0, saaCount: 0, nonSaaCount: 0 }
  ];
  
  // Compound combinations counters
  let countCmeAndStorm = 0;
  let countFlareAndCme = 0;
  let countTriplePlay = 0; // Flare + CME + Storm
  
  // Process each earthquake
  for (let i = 0; i < qualifyingQuakes.length; i++) {
    const q = qualifyingQuakes[i];
    const isSAA = isInsideSAA(q.lat, q.lon);
    
    if (isSAA) saaTotal++;
    else nonSaaTotal++;
    
    const eqTime = q.time;
    const windowStart = eqTime - windowMs;
    
    // Find preceding solar events using sliding binary bounds
    // Since we sorted eligibleSolar, let's find the start and end indexes
    let startIndex = findFirstIndexAfterOrEqual(eligibleSolar, windowStart);
    let endIndex = findLastIndexBeforeOrEqual(eligibleSolar, eqTime);
    
    let hasFlare = false;
    let hasCme = false;
    let hasHss = false;
    let hasStorm = false;
    
    let minLagHours = Infinity;
    
    if (startIndex !== -1 && endIndex !== -1 && startIndex <= endIndex) {
      for (let sIdx = startIndex; sIdx <= endIndex; sIdx++) {
        const e = eligibleSolar[sIdx];
        const lagMs = eqTime - e.time;
        const lagHours = lagMs / (1000 * 60 * 60);
        
        if (lagHours < minLagHours) {
          minLagHours = lagHours;
        }
        
        if (e.type === 'flare') hasFlare = true;
        else if (e.type === 'cme') hasCme = true;
        else if (e.type === 'hss') hasHss = true;
        else if (e.type === 'storm') hasStorm = true;
      }
    }
    
    const hasAny = hasFlare || hasCme || hasHss || hasStorm;
    
    // Hit counts general
    if (hasAny) hitAny++;
    if (hasFlare) hitFlare++;
    if (hasCme) hitCme++;
    if (hasHss) hitHss++;
    if (hasStorm) hitStorm++;
    
    // Hit counts by region
    if (isSAA) {
      if (hasAny) saaHitAny++;
      if (hasFlare) saaHitFlare++;
      if (hasCme) saaHitCme++;
      if (hasHss) saaHitHss++;
      if (hasStorm) saaHitStorm++;
    } else {
      if (hasAny) nonSaaHitAny++;
      if (hasFlare) nonSaaHitFlare++;
      if (hasCme) nonSaaHitCme++;
      if (hasHss) nonSaaHitHss++;
      if (hasStorm) nonSaaHitStorm++;
    }
    
    // Lag distribution placement
    if (hasAny && minLagHours !== Infinity) {
      for (const bin of lagBins) {
        if (minLagHours <= bin.maxHours) {
          bin.count++;
          if (isSAA) bin.saaCount++;
          else bin.nonSaaCount++;
          break; // Place in the smallest matching bin
        }
      }
    }
    
    // Compound sequences
    if (hasCme && hasStorm) countCmeAndStorm++;
    if (hasFlare && hasCme) countFlareAndCme++;
    if (hasFlare && hasCme && hasStorm) countTriplePlay++;
  }
  
  // Calculate final percentage rates
  const getRate = (hits: number, tot: number) => (tot > 0 ? (hits / tot) * 100 : 0);
  
  return {
    totalEarthquakesScanned: total,
    saaCount: saaTotal,
    nonSaaCount: nonSaaTotal,
    
    hitRates: {
      any: getRate(hitAny, total),
      flare: getRate(hitFlare, total),
      cme: getRate(hitCme, total),
      hss: getRate(hitHss, total),
      storm: getRate(hitStorm, total)
    },
    
    saaHitRates: {
      any: getRate(saaHitAny, saaTotal),
      flare: getRate(saaHitFlare, saaTotal),
      cme: getRate(saaHitCme, saaTotal),
      hss: getRate(saaHitHss, saaTotal),
      storm: getRate(saaHitStorm, saaTotal)
    },
    
    nonSaaHitRates: {
      any: getRate(nonSaaHitAny, nonSaaTotal),
      flare: getRate(nonSaaHitFlare, nonSaaTotal),
      cme: getRate(nonSaaHitCme, nonSaaTotal),
      hss: getRate(nonSaaHitHss, nonSaaTotal),
      storm: getRate(nonSaaHitStorm, nonSaaTotal)
    },
    
    lagDistribution: lagBins.map(b => ({
      label: b.label,
      count: b.count,
      saaCount: b.saaCount,
      nonSaaCount: b.nonSaaCount
    })),
    
    compoundRates: [
      { name: 'CME + Geomagnetic Storm', count: countCmeAndStorm, rate: getRate(countCmeAndStorm, total) },
      { name: 'Flare + CME Co-occurrence', count: countFlareAndCme, rate: getRate(countFlareAndCme, total) },
      { name: 'Triple Sequence (Flare + CME + Storm)', count: countTriplePlay, rate: getRate(countTriplePlay, total) }
    ]
  };
}

/**
 * Binary search helper: Find index of first element >= target
 */
function findFirstIndexAfterOrEqual(arr: UnifiedSolarEvent[], targetTime: number): number {
  let low = 0;
  let high = arr.length - 1;
  let result = -1;
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (arr[mid].time >= targetTime) {
      result = mid;
      high = mid - 1; // Try to find smaller index
    } else {
      low = mid + 1;
    }
  }
  return result;
}

/**
 * Binary search helper: Find index of last element <= target
 */
function findLastIndexBeforeOrEqual(arr: UnifiedSolarEvent[], targetTime: number): number {
  let low = 0;
  let high = arr.length - 1;
  let result = -1;
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (arr[mid].time <= targetTime) {
      result = mid;
      low = mid + 1; // Try to find larger index
    } else {
      high = mid - 1;
    }
  }
  return result;
}
