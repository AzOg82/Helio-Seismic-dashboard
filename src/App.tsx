/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import {
  SolarFlare,
  CME,
  HSS,
  GeomagneticStorm,
  Earthquake,
  UnifiedSolarEvent,
  CorrelationConfig
} from './types';
import {
  formatFlare,
  formatCME,
  formatHSS,
  formatStorm,
  filterSolarEvents,
  filterEarthquakes,
  runForwardLookup,
  runBackwardLookup,
  runAutoScan,
  isInsideSAA
} from './utils';
import { WorldMap } from './components/WorldMap';
import { PrecedingTimeline } from './components/PrecedingTimeline';
import { AutoScanStats } from './components/AutoScanStats';
import { FilterPanel } from './components/FilterPanel';
import {
  Sun,
  Activity,
  Compass,
  Globe,
  RefreshCw,
  AlertCircle,
  Calendar,
  List,
  Sparkles,
  HelpCircle,
  Zap,
  Flame,
  Radio,
  ShieldAlert,
  Info
} from 'lucide-react';

const DEFAULT_CONFIG: CorrelationConfig = {
  windowDays: 7,
  minEarthquakeMagnitude: 5.5,
  minFlareClass: 'all',
  minCmeSpeed: 0,
  minStormKp: 0,
  insideSAAOnly: 'all'
};

export default function App() {
  // Datasets
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [unifiedSolar, setUnifiedSolar] = useState<UnifiedSolarEvent[]>([]);
  
  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingStatus, setLoadingStatus] = useState<string>('Initializing systems...');
  const [loadingProgress, setLoadingProgress] = useState<number>(10);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  
  // App Configurations
  const [config, setConfig] = useState<CorrelationConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<'forward' | 'backward' | 'scan'>('scan');

  // Search & Selector State
  const [selectedEarthquake, setSelectedEarthquake] = useState<Earthquake | null>(null);
  const [selectedSolarEvent, setSelectedSolarEvent] = useState<UnifiedSolarEvent | null>(null);
  const [earthquakeSearchQuery, setEarthquakeSearchQuery] = useState<string>('');
  const [solarSearchQuery, setSolarSearchQuery] = useState<string>('');
  const [solarTypeFilter, setSolarTypeFilter] = useState<'all' | 'flare' | 'cme' | 'hss' | 'storm'>('all');

  // Date Range Selection State
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datasetBounds, setDatasetBounds] = useState<{ min: string; max: string }>({ min: '', max: '' });

  // Meta stats
  const [metaInfo, setMetaInfo] = useState<{ end_date: string; total_records: number }>({
    end_date: '2026-06-30',
    total_records: 0
  });

  // Main Data Loading Effect
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setLoadingProgress(15);
        setLoadingStatus('Downloading NASA space weather repositories...');

        const urls = {
          flares: './solar_seismic_data/solar/flares.json',
          cmes: './solar_seismic_data/solar/cmes.json',
          hss: './solar_seismic_data/solar/hss.json',
          storms: './solar_seismic_data/solar/storms.json',
          earthquakes: './solar_seismic_data/seismic/earthquakes.json'
        };

        // Fetch flares
        setLoadingStatus('Fetching solar flares archive...');
        const flaresRes = await fetch(urls.flares);
        if (!flaresRes.ok) throw new Error('Failed to load local flares dataset. Please ensure the repository assets are available.');
        const rawFlares: SolarFlare[] = await flaresRes.json();
        setLoadingProgress(35);

        // Fetch CMEs
        setLoadingStatus('Fetching coronal mass ejections (CME) catalog...');
        const cmesRes = await fetch(urls.cmes);
        if (!cmesRes.ok) throw new Error('Failed to load local CMEs dataset. Please ensure the repository assets are available.');
        const rawCmes: CME[] = await cmesRes.json();
        setLoadingProgress(55);

        // Fetch HSS and Storms in parallel
        setLoadingStatus('Fetching geomagnetic storms and HSS arrivals...');
        const [hssRes, stormsRes] = await Promise.all([fetch(urls.hss), fetch(urls.storms)]);
        if (!hssRes.ok || !stormsRes.ok) throw new Error('Failed to load local geomagnetic datasets. Please ensure the repository assets are available.');
        const rawHss: HSS[] = await hssRes.json();
        const rawStorms: GeomagneticStorm[] = await stormsRes.json();
        setLoadingProgress(75);

        // Fetch Earthquakes
        setLoadingStatus('Compiling global seismological records (34,182 EQs)...');
        const quakesRes = await fetch(urls.earthquakes);
        if (!quakesRes.ok) throw new Error('Failed to load local earthquakes dataset. Please ensure the repository assets are available.');
        const rawQuakes: Earthquake[] = await quakesRes.json();
        setLoadingProgress(90);

        setLoadingStatus('Synthesizing unified temporal timelines...');
        
        // Convert to unified models
        const unifiedFlares = rawFlares.map(formatFlare);
        const unifiedCmes = rawCmes.map(formatCME);
        const unifiedHss = rawHss.map(formatHSS);
        const unifiedStorms = rawStorms.map(formatStorm);

        const mergedSolar = [...unifiedFlares, ...unifiedCmes, ...unifiedHss, ...unifiedStorms];
        // Sort chronologically
        mergedSolar.sort((a, b) => a.time - b.time);

        setEarthquakes(rawQuakes);
        setUnifiedSolar(mergedSolar);

        // Compute dataset bounds
        let minTime = Date.now();
        let maxTime = 0;
        if (rawQuakes.length > 0) {
          rawQuakes.forEach(q => {
            if (q.time < minTime) minTime = q.time;
            if (q.time > maxTime) maxTime = q.time;
          });
        }
        if (mergedSolar.length > 0) {
          mergedSolar.forEach(e => {
            if (e.time < minTime) minTime = e.time;
            if (e.time > maxTime) maxTime = e.time;
          });
        }
        if (minTime <= maxTime) {
          const minDateStr = new Date(minTime).toISOString().split('T')[0];
          const maxDateStr = new Date(maxTime).toISOString().split('T')[0];
          setDatasetBounds({ min: minDateStr, max: maxDateStr });
          setStartDate(minDateStr);
          setEndDate(maxDateStr);
        }
        
        const totalCount = rawQuakes.length + mergedSolar.length;
        setMetaInfo({
          end_date: '2026-06-30',
          total_records: totalCount
        });

        // Set default selections
        if (rawQuakes.length > 0) setSelectedEarthquake(rawQuakes[rawQuakes.length - 1]);
        if (mergedSolar.length > 0) setSelectedSolarEvent(mergedSolar[mergedSolar.length - 1]);
        
        setLoading(false);
      } catch (err: any) {
        console.error('Fetch error:', err);
        setError(err.message || 'A network error occurred while fetching raw datasets from NASA/USGS repositories.');
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshTrigger]);

  // Handle configuration changes
  const handleConfigChange = (newConfig: CorrelationConfig) => {
    setConfig(newConfig);
  };

  // Base datasets filtered by selected date range
  const dateFilteredEarthquakes = useMemo(() => {
    if (!startDate && !endDate) return earthquakes;
    const startMs = startDate ? new Date(startDate).getTime() : 0;
    const endMs = endDate ? new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1 : Infinity;
    return earthquakes.filter(q => q.time >= startMs && q.time <= endMs);
  }, [earthquakes, startDate, endDate]);

  const dateFilteredUnifiedSolar = useMemo(() => {
    if (!startDate && !endDate) return unifiedSolar;
    const startMs = startDate ? new Date(startDate).getTime() : 0;
    const endMs = endDate ? new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1 : Infinity;
    return unifiedSolar.filter(e => e.time >= startMs && e.time <= endMs);
  }, [unifiedSolar, startDate, endDate]);

  // Keep selected items in sync with the filtered list
  useEffect(() => {
    if (dateFilteredEarthquakes.length > 0) {
      if (!selectedEarthquake || !dateFilteredEarthquakes.some(q => q.time === selectedEarthquake.time && q.place === selectedEarthquake.place)) {
        setSelectedEarthquake(dateFilteredEarthquakes[dateFilteredEarthquakes.length - 1]);
      }
    } else {
      setSelectedEarthquake(null);
    }
  }, [dateFilteredEarthquakes, selectedEarthquake]);

  useEffect(() => {
    if (dateFilteredUnifiedSolar.length > 0) {
      if (!selectedSolarEvent || !dateFilteredUnifiedSolar.some(e => e.id === selectedSolarEvent.id)) {
        setSelectedSolarEvent(dateFilteredUnifiedSolar[dateFilteredUnifiedSolar.length - 1]);
      }
    } else {
      setSelectedSolarEvent(null);
    }
  }, [dateFilteredUnifiedSolar, selectedSolarEvent]);

  // MEMOIZED COMPUTATIONS TO PREVENT INFINITE RE-RENDERS & LAG

  // 1. Filtered Earthquakes (based on configuration and search)
  const filteredEarthquakesList = useMemo(() => {
    const minMag = config.minEarthquakeMagnitude;
    return dateFilteredEarthquakes.filter(q => {
      if (q.mag < minMag) return false;
      
      const isSaa = isInsideSAA(q.lat, q.lon);
      if (config.insideSAAOnly === 'saa' && !isSaa) return false;
      if (config.insideSAAOnly === 'non-saa' && isSaa) return false;

      if (earthquakeSearchQuery) {
        const query = earthquakeSearchQuery.toLowerCase();
        return q.place.toLowerCase().includes(query) || q.mag.toString().includes(query);
      }
      
      return true;
    });
  }, [dateFilteredEarthquakes, config.minEarthquakeMagnitude, config.insideSAAOnly, earthquakeSearchQuery]);

  // 2. Filtered Solar Events (based on configuration, search, and type filters)
  const filteredSolarList = useMemo(() => {
    const eligible = filterSolarEvents(dateFilteredUnifiedSolar, config);
    return eligible.filter(e => {
      if (solarTypeFilter !== 'all' && e.type !== solarTypeFilter) return false;
      
      if (solarSearchQuery) {
        const query = solarSearchQuery.toLowerCase();
        return e.label.toLowerCase().includes(query) || e.details.toLowerCase().includes(query);
      }
      return true;
    });
  }, [dateFilteredUnifiedSolar, config, solarTypeFilter, solarSearchQuery]);

  // 3. Forward Lookup Results (Earthquakes following the selected solar event)
  const forwardResult = useMemo(() => {
    if (!selectedSolarEvent) return null;
    return runForwardLookup(selectedSolarEvent, dateFilteredEarthquakes, config);
  }, [selectedSolarEvent, dateFilteredEarthquakes, config]);

  // 4. Backward Lookup Results (Solar events preceding the selected earthquake)
  const backwardResult = useMemo(() => {
    if (!selectedEarthquake) return null;
    return runBackwardLookup(selectedEarthquake, dateFilteredUnifiedSolar, config);
  }, [selectedEarthquake, dateFilteredUnifiedSolar, config]);

  // 5. Auto Scan Statistics (Aggregated correlation results over all eligible earthquakes)
  const autoScanStats = useMemo(() => {
    if (loading) return null;
    return runAutoScan(dateFilteredEarthquakes, dateFilteredUnifiedSolar, config);
  }, [dateFilteredEarthquakes, dateFilteredUnifiedSolar, config, loading]);

  return (
    <div className="min-h-screen bg-[#050608] text-[#a0a5b0] flex flex-col selection:bg-orange-500/30 selection:text-orange-200">
      {/* Immersive Header */}
      <header className="h-16 flex items-center justify-between px-6 bg-black/40 border-b border-white/10 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-600 to-yellow-400 shadow-[0_0_15px_rgba(249,115,22,0.4)]"></div>
          <h1 className="text-lg font-bold tracking-tight text-white font-display">
            HELIOSEISMIC <span className="text-orange-500">CORRELATION</span>
          </h1>
        </div>

        {/* High-Tech Status & Controls */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-mono text-cyan-400">
              {dateFilteredEarthquakes.length.toLocaleString()} of {earthquakes.length.toLocaleString()} EQ · {dateFilteredUnifiedSolar.length.toLocaleString()} of {unifiedSolar.length.toLocaleString()} solar
            </p>
            <p className="text-[9px] uppercase tracking-widest text-white/40">Active Temporal Scope</p>
          </div>

          <div className="px-3 py-1 rounded bg-white/5 border border-white/10 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-[10px] text-white/80 uppercase font-mono tracking-wider">
              Live Archive Only
            </span>
          </div>

          <button
            onClick={() => {
              setRefreshTrigger(prev => prev + 1);
            }}
            className="px-2.5 py-1 text-[10px] bg-white/5 text-white/70 border border-white/10 hover:border-orange-500/50 hover:text-orange-400 rounded transition-all duration-150 font-mono tracking-wider uppercase cursor-pointer flex items-center gap-1.5"
            title="Force refresh raw NASA/USGS datasets"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Update Feed</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      {loading ? (
        /* Dynamic Loader Screen */
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#050608]">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <Sun className="w-10 h-10 text-orange-500 animate-spin absolute" style={{ animationDuration: '6s' }} />
              <Activity className="w-6 h-6 text-cyan-400 animate-pulse absolute" />
            </div>

            <div className="space-y-2 font-mono">
              <div className="text-xs font-bold text-white tracking-wider uppercase">
                {loadingStatus}
              </div>
              <div className="text-[10px] text-white/40">
                {earthquakes.length > 0 ? 'Synthesizing ephemeris datasets...' : 'Checking connection limits...'}
              </div>
            </div>

            {/* Custom progress bar */}
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-orange-500 to-red-500 rounded-full transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>

            <p className="text-[10px] text-white/30 font-mono italic">
              "Correlation permitted, causation prohibited." Analyzing solar loading triggers against global seismic ruptures.
            </p>
          </div>
        </div>
      ) : error ? (
        /* Error Screen when limits are hit or fetch fails - DON'T FAKE DATA! */
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#050608]">
          <div className="max-w-md w-full space-y-6 text-center border border-red-500/20 bg-red-500/5 p-8 rounded-2xl backdrop-blur-md">
            <div className="relative mx-auto w-12 h-12 flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-red-500 animate-pulse" />
            </div>

            <div className="space-y-3 font-mono">
              <h2 className="text-sm font-bold text-red-500 tracking-wider uppercase">
                Connection Limit Exceeded / Loading Error
              </h2>
              <div className="text-xs text-white/70 bg-black/40 border border-white/5 p-4 rounded-xl leading-relaxed text-left break-words">
                {error}
              </div>
              <p className="text-[10px] text-white/40 leading-normal">
                Please ensure that the local space-weather and seismic dataset JSON files are correctly placed in the public/solar_seismic_data/ folder.
              </p>
            </div>

            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                setRefreshTrigger(prev => prev + 1);
              }}
              className="px-4 py-2 text-xs bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:text-white rounded-lg transition-all font-mono uppercase cursor-pointer"
            >
              Retry Live Archive Fetch
            </button>
          </div>
        </div>
      ) : (
        /* Full Application */
        <div className="flex-1 flex flex-col lg:flex-row p-6 gap-6 overflow-hidden">
          {/* Left Sidebar Filter Panel */}
          <aside className="w-full lg:w-80 shrink-0">
            <FilterPanel
              config={config}
              onChange={handleConfigChange}
              loading={loading}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              startDate={startDate}
              endDate={endDate}
              setStartDate={setStartDate}
              setEndDate={setEndDate}
              datasetBounds={datasetBounds}
            />
          </aside>

          {/* Main Dashboard Space */}
          <main className="flex-1 flex flex-col space-y-6 overflow-y-auto">
            {/* View Indicator Header */}
            <div className="flex justify-between items-center border-b border-white/10 pb-3 flex-wrap gap-4">
              <div className="flex items-center gap-2.5 font-display">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_10px_#f97316] animate-pulse"></div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  {activeTab === 'scan' && 'Statistical Hit Rate Distribution'}
                  {activeTab === 'backward' && 'Tectonic Precursor Backward Analysis'}
                  {activeTab === 'forward' && 'Solar Flare Forward Correlation Lookup'}
                </h2>
              </div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
                System Status: Active
              </div>
            </div>

            {/* TAB CONTENT: AUTO SCAN STATISTICS */}
            {activeTab === 'scan' && autoScanStats && (
              <div className="space-y-6">
                {/* World Map with all matching earthquakes */}
                <WorldMap
                  earthquakes={filteredEarthquakesList.slice(-200)} // Show up to last 200 for plotting speed
                  selectedEarthquake={selectedEarthquake}
                  onSelectEarthquake={(eq) => {
                    setSelectedEarthquake(eq);
                    setActiveTab('backward');
                  }}
                />
                
                {/* Statistics Component */}
                <AutoScanStats stats={autoScanStats} config={config} />
              </div>
            )}

            {/* TAB CONTENT: BACKWARD LOOKUP */}
            {activeTab === 'backward' && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Selector column */}
                <div className="xl:col-span-5 flex flex-col bg-black/40 border border-white/10 rounded-2xl p-4 h-[550px]">
                  <div className="mb-3">
                    <h3 className="text-xs font-mono font-bold text-white uppercase flex items-center space-x-1.5">
                      <List className="w-3.5 h-3.5 text-orange-500" />
                      <span>Seismic Records Search</span>
                    </h3>
                    <input
                      type="text"
                      placeholder="Search epicenters (e.g. Chile, Japan)..."
                      value={earthquakeSearchQuery}
                      onChange={(e) => setEarthquakeSearchQuery(e.target.value)}
                      className="mt-2 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>

                  {/* Scrollable List */}
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                    {filteredEarthquakesList.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 font-mono text-xs">
                        No earthquakes match parameters.
                      </div>
                    ) : (
                      filteredEarthquakesList.map((eq, idx) => {
                        const isSaa = isInsideSAA(eq.lat, eq.lon);
                        const isSelected = selectedEarthquake?.time === eq.time;
                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedEarthquake(eq)}
                            className={`p-2.5 rounded-lg border cursor-pointer select-none transition-all ${
                              isSelected
                                ? 'bg-orange-500/10 border-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.1)]'
                                : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-[11px] text-white">
                                M{eq.mag.toFixed(1)}
                              </span>
                              <span className="text-[9px] font-mono text-slate-500">
                                {new Date(eq.time).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="text-[10px] mt-0.5 truncate text-slate-300 font-sans">
                              {eq.place}
                            </div>
                            <div className="flex justify-between items-center mt-1.5 text-[9px] font-mono text-slate-500 border-t border-white/5 pt-1">
                              <span>Depth: {eq.depth} km</span>
                              {isSaa && (
                                <span className="text-orange-400 font-bold bg-orange-500/10 px-1 py-0.2 rounded border border-orange-500/20">
                                  SAA Zone
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Main visualization column */}
                <div className="xl:col-span-7 space-y-6">
                  {selectedEarthquake ? (
                    <>
                      {/* Interactive World Map plotting this single EQ relative to SAA */}
                      <WorldMap
                        earthquakes={[selectedEarthquake]}
                        selectedEarthquake={selectedEarthquake}
                        highlightSAA={true}
                      />

                      {/* EQ Info Card */}
                      <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-md">
                        <div className="flex justify-between items-start border-b border-white/10 pb-3 mb-3">
                          <div>
                            <h2 className="text-sm font-sans font-bold text-white">
                              {selectedEarthquake.place}
                            </h2>
                            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                              Occurrence: {new Date(selectedEarthquake.time).toUTCString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-mono font-bold text-orange-500 block">
                              M{selectedEarthquake.mag.toFixed(1)}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              Depth: {selectedEarthquake.depth} km
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-[10px] font-mono text-slate-400 mb-2">
                          <div>
                            <span className="block text-white/40 font-bold">COORDINATES</span>
                            <span className="text-slate-300">
                              Lat: {selectedEarthquake.lat.toFixed(3)}°, Lon: {selectedEarthquake.lon.toFixed(3)}°
                            </span>
                          </div>
                          <div>
                            <span className="block text-white/40 font-bold">GEOMAGNETIC POCKET</span>
                            {isInsideSAA(selectedEarthquake.lat, selectedEarthquake.lon) ? (
                              <span className="text-orange-400 font-bold flex items-center space-x-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316] animate-pulse"></span>
                                <span>INSIDE SAA WEAKNESS</span>
                              </span>
                            ) : (
                              <span className="text-slate-300">Baseline (Regular Field)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Preceding timeline visualization */}
                      {backwardResult && (
                        <PrecedingTimeline
                          earthquake={selectedEarthquake}
                          solarEvents={backwardResult.precedingSolarEvents}
                          windowDays={config.windowDays}
                        />
                      )}
                    </>
                  ) : (
                    <div className="h-64 flex items-center justify-center border border-dashed border-white/10 rounded-2xl text-slate-500 text-xs font-mono">
                      Please select an earthquake from the list to analyze precursors.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: FORWARD LOOKUP */}
            {activeTab === 'forward' && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Selector column */}
                <div className="xl:col-span-5 flex flex-col bg-black/40 border border-white/10 rounded-2xl p-4 h-[550px]">
                  <div className="mb-3 space-y-2.5">
                    <h3 className="text-xs font-mono font-bold text-white uppercase flex items-center space-x-1.5">
                      <Sun className="w-3.5 h-3.5 text-orange-500" />
                      <span>Solar Event Repositories</span>
                    </h3>
                    
                    {/* Event type filter button strip */}
                    <div className="grid grid-cols-5 gap-1 text-[10px] font-mono font-bold">
                      {(['all', 'flare', 'cme', 'hss', 'storm'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setSolarTypeFilter(type)}
                          className={`py-1 rounded text-center border capitalize transition-all duration-150 cursor-pointer ${
                            solarTypeFilter === type
                              ? 'bg-orange-500/10 border-orange-500 text-orange-400 font-bold'
                              : 'bg-black/20 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      placeholder="Search active regions or classes..."
                      value={solarSearchQuery}
                      onChange={(e) => setSolarSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>

                  {/* Scrollable list */}
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                    {filteredSolarList.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 font-mono text-xs">
                        No solar events match search filters.
                      </div>
                    ) : (
                      filteredSolarList.map((event, idx) => {
                        const isSelected = selectedSolarEvent?.id === event.id;
                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedSolarEvent(event)}
                            className={`p-2.5 rounded-lg border cursor-pointer select-none transition-all ${
                              isSelected
                                ? 'bg-orange-500/10 border-orange-500/60 text-white shadow-[0_0_15px_rgba(249,115,22,0.1)]'
                                : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-[11px] text-white flex items-center space-x-1">
                                {event.type === 'flare' && <Flame className="w-3 h-3 text-orange-500" />}
                                {event.type === 'cme' && <Radio className="w-3 h-3 text-purple-400" />}
                                {event.type === 'hss' && <Zap className="w-3 h-3 text-teal-400" />}
                                {event.type === 'storm' && <ShieldAlert className="w-3 h-3 text-red-500" />}
                                <span>{event.label}</span>
                              </span>
                              <span className="text-[9px] font-mono text-slate-500">
                                {new Date(event.time).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="text-[10px] mt-0.5 truncate text-slate-400">
                              {event.details}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Main visualization column */}
                <div className="xl:col-span-7 space-y-6">
                  {selectedSolarEvent ? (
                    <>
                      {/* World Map showing earthquakes triggered during the solar event window */}
                      {forwardResult && (
                        <WorldMap
                          earthquakes={forwardResult.followingEarthquakes}
                          selectedEarthquake={null}
                          highlightSAA={true}
                        />
                      )}

                      {/* Solar Event Detail Panel */}
                      <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-md">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-4">
                          <div>
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-orange-950 text-orange-400 border border-orange-900/30 uppercase block w-max mb-1.5 font-bold">
                              {selectedSolarEvent.type} EVENT RECORD
                            </span>
                            <h2 className="text-sm font-sans font-bold text-white">
                              {selectedSolarEvent.label}
                            </h2>
                            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                              Arrival/Onset: {new Date(selectedSolarEvent.time).toUTCString()}
                            </p>
                          </div>
                        </div>

                        <div className="text-[11px] font-mono text-slate-400 space-y-2">
                          <p>
                            <strong className="text-white/60 font-bold">Description:</strong> {selectedSolarEvent.details}
                          </p>
                          <p>
                            <strong className="text-white/60 font-bold">Catalog identifier:</strong> {selectedSolarEvent.id}
                          </p>
                        </div>
                      </div>

                      {/* Triggered Earthquakes list */}
                      <div className="bg-black/40 border border-white/10 rounded-2xl p-5">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-3">
                          <div>
                            <h3 className="text-xs font-mono font-bold text-white uppercase">
                              Correlated Seismic Discharge
                            </h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Earthquakes following this solar event within T+{config.windowDays} days
                            </p>
                          </div>
                          <span className="text-xs font-mono bg-orange-950 text-orange-300 px-2 py-0.5 rounded border border-orange-800 font-bold">
                            {forwardResult?.followingEarthquakes.length || 0} EQs Correlated
                          </span>
                        </div>

                        <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                          {forwardResult && forwardResult.followingEarthquakes.length > 0 ? (
                            forwardResult.followingEarthquakes.map((eq, idx) => {
                              const hoursDelta = ((eq.time - selectedSolarEvent.time) / (1000 * 60 * 60)).toFixed(1);
                              const isSaa = isInsideSAA(eq.lat, eq.lon);
                              return (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    setSelectedEarthquake(eq);
                                    setActiveTab('backward');
                                  }}
                                  className="p-2.5 bg-black/60 border border-white/5 rounded-lg hover:border-orange-500/40 cursor-pointer flex justify-between items-center transition-colors"
                                >
                                  <div>
                                    <div className="text-[11px] font-sans font-bold text-white flex items-center space-x-1.5">
                                      <span className="text-orange-500 font-mono">M{eq.mag.toFixed(1)}</span>
                                      <span className="text-slate-300 font-normal truncate max-w-xs">{eq.place}</span>
                                    </div>
                                    <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                                      Depth: {eq.depth} km · Lat: {eq.lat.toFixed(1)}°, Lon: {eq.lon.toFixed(1)}°
                                    </div>
                                  </div>
                                  <div className="text-right font-mono text-[10px] leading-tight">
                                    <div className="text-orange-400 font-bold">+{hoursDelta} hrs</div>
                                    <div className="text-[9px] text-slate-500">delay</div>
                                    {isSaa && (
                                      <span className="text-[8px] bg-orange-500/10 text-orange-400 font-bold px-1 rounded block w-max ml-auto mt-0.5 border border-orange-500/20">
                                        SAA Zone
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-8 text-slate-500 text-xs font-mono">
                              No earthquakes matching parameters followed this space event.
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-64 flex items-center justify-center border border-dashed border-white/10 rounded-2xl text-slate-500 text-xs font-mono">
                      Please select a solar event from the list to run forward lookups.
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Footer / Scientific credits */}
      <footer className="border-t border-white/5 bg-black/60 p-4 flex flex-col md:flex-row justify-between items-center text-[10px] font-mono text-white/30 gap-2">
        <div className="flex items-center space-x-2">
          <span>Data feeds synchronized with NASA Space Weather DONKI API & USGS Earthquake Archive.</span>
        </div>
        <div className="flex space-x-4">
          <span>Active Period: 2008 – 2026</span>
          <span>© HelioSeismic Correlation Network</span>
        </div>
      </footer>
    </div>
  );
}
