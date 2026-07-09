/**
 * Modular Data Fetcher
 * Loads year-sharded solar and seismic data from helioseismic-data repo
 * Supports bandwidth-efficient query modes
 */

const REPO_BASE_URL = "https://raw.githubusercontent.com/AzOg82/helioseismic-data/main/solar_seismic_data/years";

export interface SolarEvent {
  type: 'CME' | 'HSS' | 'FLR' | 'GST';
  timestamp: number | string;
  bz_flip?: boolean;
  [key: string]: any;
}

export interface SeismicEvent {
  timestamp: number | string;
  magnitude: number;
  latitude: number;
  longitude: number;
  [key: string]: any;
}

export interface YearShard {
  year: number;
  solarEvents: {
    flares: any[];
    cmes: any[];
    hss: any[];
    storms: any[];
  };
  seismicEvents: any[];
}

/**
 * Safely fetch and parse JSON from GitHub raw
 */
async function fetchJsonFile(path: string): Promise<any> {
  try {
    const response = await fetch(`${REPO_BASE_URL}/${path}`);
    if (!response.ok) throw new Error(`Network error for file: ${path}`);
    return await response.json();
  } catch (error) {
    console.error(`Failed to load data slice: ${path}`, error);
    return null;
  }
}

/**
 * Convert various timestamp formats to milliseconds
 */
function normalizeTimestamp(ts: any): number {
  if (typeof ts === 'number') {
    // Already ms or seconds?
    return ts > 1e10 ? ts : ts * 1000;
  }
  if (typeof ts === 'string') {
    return new Date(ts).getTime();
  }
  return 0;
}

/**
 * Normalize solar events to standard format
 */
function normalizeSolarEvents(year: YearShard): SolarEvent[] {
  const events: SolarEvent[] = [];

  // Flares
  (year.solarEvents.flares || []).forEach((f: any) => {
    events.push({
      type: 'FLR',
      timestamp: normalizeTimestamp(f.peakTime || f.beginTime),
      bz_flip: false,
      ...f
    });
  });

  // CMEs
  (year.solarEvents.cmes || []).forEach((c: any) => {
    events.push({
      type: 'CME',
      timestamp: normalizeTimestamp(c.startTime),
      bz_flip: true, // CMEs typically cause Bz fluctuations
      ...c
    });
  });

  // HSS (High Speed Streams)
  (year.solarEvents.hss || []).forEach((h: any) => {
    events.push({
      type: 'HSS',
      timestamp: normalizeTimestamp(h.eventTime),
      bz_flip: false,
      ...h
    });
  });

  // Geomagnetic Storms
  (year.solarEvents.storms || []).forEach((g: any) => {
    events.push({
      type: 'GST',
      timestamp: normalizeTimestamp(g.startTime),
      bz_flip: true, // Storms typically involve Bz dynamics
      ...g
    });
  });

  return events;
}

/**
 * Normalize seismic events to standard format
 */
function normalizeSeismicEvents(events: any[]): SeismicEvent[] {
  return (events || []).map((eq: any) => ({
    timestamp: normalizeTimestamp(eq.time),
    magnitude: eq.mag || 0,
    latitude: eq.lat || 0,
    longitude: eq.lon || 0,
    ...eq
  }));
}

/**
 * Dynamic Multi-Mode Router
 * Orchestrates file fetches based on user filter to save bandwidth
 */
export async function runSolarSeismicSearch(
  mode: 'PAST_TWO_YEARS' | 'SOLAR_CYCLE' | 'DATE_RANGE' | 'GLOBAL_18_YEAR',
  parameters: Record<string, any> = {}
): Promise<{ solar: SolarEvent[]; seismic: SeismicEvent[] }> {
  let filesToFetch: string[] = [];
  const currentYear = new Date().getFullYear();

  switch (mode) {
    case 'PAST_TWO_YEARS':
      filesToFetch = [`${currentYear}.json`, `${currentYear - 1}.json`];
      break;

    case 'SOLAR_CYCLE':
      // Fetch years for a given solar cycle (typically ~11 years)
      // Example: Cycle 24 = 2008-2018
      filesToFetch.push(`cycle_${parameters.cycleNumber}.json`);
      break;

    case 'DATE_RANGE': {
      const startYear = new Date(parameters.startDate).getFullYear();
      const endYear = new Date(parameters.endDate).getFullYear();
      for (let y = startYear; y <= endYear; y++) {
        filesToFetch.push(`${y}.json`);
      }
      break;
    }

    case 'GLOBAL_18_YEAR':
      // Loop across 18 years sequentially
      for (let y = currentYear - 18; y <= currentYear; y++) {
        filesToFetch.push(`${y}.json`);
      }
      break;
  }

  console.log(`[DataFetcher] Mode: ${mode}, Files:`, filesToFetch);

  let combinedSolar: SolarEvent[] = [];
  let combinedSeismic: SeismicEvent[] = [];

  // Load year shards sequentially (mobile-friendly)
  for (const file of filesToFetch) {
    const yearData = await fetchJsonFile(file);
    if (!yearData) continue;

    combinedSolar.push(...normalizeSolarEvents(yearData));
    combinedSeismic.push(...normalizeSeismicEvents(yearData.seismicEvents));
  }

  return {
    solar: combinedSolar,
    seismic: combinedSeismic
  };
}
