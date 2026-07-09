/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SolarFlare {
  flrID: string;
  beginTime: string;
  peakTime: string;
  endTime: string;
  classType: string;
  sourceLocation?: string;
  activeRegionNum?: number | null;
  link?: string;
}

export interface CMEAnalysis {
  isMostAccurate: boolean;
  speed?: number;
  type?: string;
}

export interface CME {
  activityID: string;
  startTime: string;
  sourceLocation?: string;
  cmeAnalyses?: CMEAnalysis[];
  link?: string;
}

export interface HSS {
  hssID: string;
  eventTime: string;
  link?: string;
}

export interface KpIndex {
  observedTime: string;
  kpIndex: number;
  source: string;
}

export interface GeomagneticStorm {
  gstID: string;
  startTime: string;
  allKpIndex?: KpIndex[];
  link?: string;
}

export interface Earthquake {
  time: number; // millisecond timestamp
  mag: number;
  place: string;
  lat: number;
  lon: number;
  depth: number;
}

export type SolarEventType = 'flare' | 'cme' | 'hss' | 'storm';

export interface UnifiedSolarEvent {
  id: string;
  type: SolarEventType;
  time: number; // ms timestamp
  originalTimeStr: string;
  label: string; // e.g. "M2.0 Flare"
  details: string; // e.g. "Location: N22W43, AR 11081"
  magnitude: number; // custom rating for filtering/charting
  raw: any; // original object
}

export interface CorrelationConfig {
  windowDays: number; // number of days to look ahead/behind
  minEarthquakeMagnitude: number;
  minFlareClass: 'all' | 'M' | 'X';
  minCmeSpeed: number; // km/s, 0 for all
  minStormKp: number; // 0 for all
  insideSAAOnly: 'all' | 'saa' | 'non-saa';
}

export interface BackwardCorrelationResult {
  earthquake: Earthquake;
  precedingSolarEvents: UnifiedSolarEvent[];
  hasFlare: boolean;
  hasCme: boolean;
  hasHss: boolean;
  hasStorm: boolean;
  isSAA: boolean;
}

export interface ForwardCorrelationResult {
  solarEvent: UnifiedSolarEvent;
  followingEarthquakes: Earthquake[];
  totalCount: number;
}

export interface ScanStats {
  totalEarthquakesScanned: number;
  saaCount: number;
  nonSaaCount: number;
  
  hitRates: {
    any: number;
    flare: number;
    cme: number;
    hss: number;
    storm: number;
  };
  
  saaHitRates: {
    any: number;
    flare: number;
    cme: number;
    hss: number;
    storm: number;
  };

  nonSaaHitRates: {
    any: number;
    flare: number;
    cme: number;
    hss: number;
    storm: number;
  };

  // Lag distribution (in hours, e.g. [0-12, 12-24, 24-48, 48-72, 72-120, 120-168])
  lagDistribution: {
    label: string;
    count: number;
    saaCount: number;
    nonSaaCount: number;
  }[];
  
  // Compound sequence rates (e.g., CME + Storm preceding EQ)
  compoundRates: {
    name: string;
    count: number;
    rate: number;
  }[];
}
