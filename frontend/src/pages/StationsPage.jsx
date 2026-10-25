import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { stationService } from '../services/stationService.js';
import { StationCard } from '../components/stations/StationCard.jsx';
import { StationMap } from '../components/stations/StationMap.jsx';
import { StationFilters } from '../components/stations/StationFilters.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { Alert } from '../components/common/Alert.jsx';
import { Map, List, AlertTriangle, RefreshCw } from 'lucide-react';

export const StationsPage = () => {
  const [stations, setStations] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [backgroundRefreshError, setBackgroundRefreshError] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState(null);

  // Search & Filter State
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedConnector, setSelectedConnector] = useState('ALL');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  // Selection & Mobile view State
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [mobileTab, setMobileTab] = useState('list'); // 'list' | 'map'

  // Ref to prevent overlapping in-flight polling requests
  const isFetchingRef = useRef(false);

  // Debounce search input by 350ms to prevent API thrashing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 350);

    return () => clearTimeout(handler);
  }, [searchInput]);

  // Initial load & search query change with cleanup flag
  useEffect(() => {
    let ignore = false;

    const fetchStations = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const res = await stationService.getStations(debouncedSearch);
        if (!ignore && res.success && Array.isArray(res.data)) {
          setStations(res.data);
          setFetchError(null);
          setBackgroundRefreshError(false);
          setLastUpdatedTime(new Date());

          setSelectedStationId((prevId) => {
            if (prevId && res.data.some((s) => s.id === prevId)) return prevId;
            return res.data[0]?.id || null;
          });
        }
      } catch (err) {
        if (!ignore) {
          console.error('[STATIONS_FETCH_ERROR]', err);
          setFetchError(
            err.message || 'Unable to load charging stations. Please ensure the backend server is running.'
          );
        }
      } finally {
        isFetchingRef.current = false;
        if (!ignore) {
          setInitialLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    fetchStations();

    return () => {
      ignore = true;
    };
  }, [debouncedSearch]);

  // Periodic Polling: refresh every 20 seconds while page is active
  useEffect(() => {
    const POLL_INTERVAL_MS = 20000;

    const pollStations = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const res = await stationService.getStations(debouncedSearch);
        if (res.success && Array.isArray(res.data)) {
          setStations(res.data);
          setBackgroundRefreshError(false);
          setLastUpdatedTime(new Date());
        }
      } catch (err) {
        console.warn('[STATIONS_POLL_WARN]', err.message);
        setBackgroundRefreshError(true);
      } finally {
        isFetchingRef.current = false;
      }
    };

    const intervalId = setInterval(pollStations, POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [debouncedSearch]);

  // Client-side filtering supported by actual backend fields (connector_type and available_slots)
  const filteredStations = useMemo(() => {
    return stations.filter((station) => {
      // 1. Connector Type Filter
      if (selectedConnector !== 'ALL') {
        const stationConnectors = (station.connector_type || '').toUpperCase();
        const targetConnector = selectedConnector.toUpperCase();
        if (!stationConnectors.includes(targetConnector)) {
          return false;
        }
      }

      // 2. Only Available Filter
      if (onlyAvailable) {
        if (station.status === 'maintenance' || station.available_slots <= 0) {
          return false;
        }
      }

      return true;
    });
  }, [stations, selectedConnector, onlyAvailable]);

  // Active selected station object
  const activeStation = useMemo(() => {
    return stations.find((s) => s.id === selectedStationId) || filteredStations[0] || null;
  }, [stations, selectedStationId, filteredStations]);

  // Synchronize selection between List and Map
  const handleSelectStation = useCallback((station) => {
    setSelectedStationId(station.id);
  }, []);

  const handleManualRefresh = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsRefreshing(true);

    try {
      const res = await stationService.getStations(debouncedSearch);
      if (res.success && Array.isArray(res.data)) {
        setStations(res.data);
        setFetchError(null);
        setBackgroundRefreshError(false);
        setLastUpdatedTime(new Date());
      }
    } catch (err) {
      console.error('[MANUAL_REFRESH_ERROR]', err);
      setFetchError(err.message || 'Unable to refresh stations.');
    } finally {
      isFetchingRef.current = false;
      setIsRefreshing(false);
    }
  }, [debouncedSearch]);

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
      {/* Mobile View Switcher (Visible on < 1024px screens) */}
      <div className="mobile-view-tabs" role="tablist" aria-label="View toggle">
        <button
          type="button"
          className={`mobile-tab-btn ${mobileTab === 'list' ? 'active' : ''}`}
          onClick={() => setMobileTab('list')}
          role="tab"
          aria-selected={mobileTab === 'list'}
        >
          <List size={16} />
          <span>Stations List ({filteredStations.length})</span>
        </button>
        <button
          type="button"
          className={`mobile-tab-btn ${mobileTab === 'map' ? 'active' : ''}`}
          onClick={() => setMobileTab('map')}
          role="tab"
          aria-selected={mobileTab === 'map'}
        >
          <Map size={16} />
          <span>Interactive Map</span>
        </button>
      </div>

      {/* Background Refresh Error Warning (Non-intrusive) */}
      {backgroundRefreshError && (
        <Alert
          type="warning"
          title="Availability sync paused"
          onClose={() => setBackgroundRefreshError(false)}
        >
          <span>
            Unable to reach API on latest 20s poll. Displaying last verified data from{' '}
            {lastUpdatedTime?.toLocaleTimeString()}. Will retry automatically.
          </span>
        </Alert>
      )}

      {/* Main Split Discovery Layout */}
      <div className="station-discovery-layout">
        {/* Left Pane: Filters & Station List */}
        <section
          className="station-list-pane"
          style={{
            display: mobileTab === 'map' ? 'none' : 'flex',
          }}
          aria-label="Charging stations search and results"
        >
          {/* Filter Bar */}
          <StationFilters
            searchQuery={searchInput}
            onSearchChange={setSearchInput}
            onClearSearch={() => setSearchInput('')}
            selectedConnector={selectedConnector}
            onConnectorChange={setSelectedConnector}
            onlyAvailable={onlyAvailable}
            onToggleOnlyAvailable={setOnlyAvailable}
            onRefresh={handleManualRefresh}
            isRefreshing={isRefreshing}
            lastUpdatedTime={lastUpdatedTime}
            totalResultsCount={stations.length}
            filteredCount={filteredStations.length}
          />

          {/* Loading Indicator */}
          {initialLoading && (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <Spinner size="lg" label="Discovering Bangalore charging stations..." />
            </div>
          )}

          {/* Initial / Hard Error State */}
          {!initialLoading && fetchError && (
            <Alert type="danger" title="Unable to retrieve station catalog">
              <p style={{ marginBottom: '1rem' }}>{fetchError}</p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleManualRefresh}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
              >
                <RefreshCw size={14} />
                <span>Retry Connection</span>
              </button>
            </Alert>
          )}

          {/* Empty Results State */}
          {!initialLoading && !fetchError && filteredStations.length === 0 && (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '3rem 1.5rem',
                backgroundColor: 'var(--color-bg-surface)',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-bg-muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-text-muted)',
                  marginBottom: '1rem',
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>No Matching Charging Stations</h3>
              <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '1.25rem', maxWidth: '380px', margin: '0 auto 1.25rem' }}>
                No charging hubs matched your current filters. Try searching for a different area or reset your connector filters.
              </p>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setSearchInput('');
                  setSelectedConnector('ALL');
                  setOnlyAvailable(false);
                }}
              >
                Reset All Filters
              </button>
            </div>
          )}

          {/* Results List */}
          {!initialLoading && !fetchError && filteredStations.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {filteredStations.map((station) => (
                <StationCard
                  key={station.id}
                  station={station}
                  isSelected={activeStation?.id === station.id}
                  onSelect={(s) => {
                    handleSelectStation(s);
                    // On mobile, if user clicks "Locate on Map", switch tab to map
                    if (window.innerWidth < 1024) {
                      setMobileTab('map');
                    }
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Right Pane: Interactive Map */}
        <section
          className="station-map-pane"
          style={{
            display: mobileTab === 'list' && window.innerWidth < 1024 ? 'none' : 'block',
          }}
          aria-label="Charging stations interactive map"
        >
          <StationMap
            stations={filteredStations}
            selectedStation={activeStation}
            onSelectStation={handleSelectStation}
          />
        </section>
      </div>

      {/* Media query styling helper for responsive map pane */}
      <style>{`
        @media (min-width: 1024px) {
          .station-list-pane { display: flex !important; }
          .station-map-pane { display: block !important; }
        }
      `}</style>
    </div>
  );
};
