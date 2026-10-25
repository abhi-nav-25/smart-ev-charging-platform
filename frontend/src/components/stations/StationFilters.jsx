import { Search, X, RotateCw, Filter, Check } from 'lucide-react';

export const StationFilters = ({
  searchQuery,
  onSearchChange,
  onClearSearch,
  selectedConnector,
  onConnectorChange,
  onlyAvailable,
  onToggleOnlyAvailable,
  onRefresh,
  isRefreshing,
  lastUpdatedTime,
  totalResultsCount,
  filteredCount,
}) => {
  const connectorTypes = [
    { id: 'ALL', label: 'All Connectors' },
    { id: 'CCS2', label: 'CCS2' },
    { id: 'Type 2', label: 'Type 2' },
    { id: 'CHAdeMO', label: 'CHAdeMO' },
  ];

  return (
    <div className="station-filters-bar">
      {/* Search Input Row */}
      <div className="search-row">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search Bangalore stations by name or address (e.g. Airport, Tech Park)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search charging stations"
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={onClearSearch}
              aria-label="Clear search query"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Manual Refresh Button */}
        <button
          type="button"
          className="btn btn-secondary btn-sm refresh-btn"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Manually fetch latest slot availability"
          aria-label="Refresh station availability"
        >
          <RotateCw
            size={14}
            className={isRefreshing ? 'spinner-icon' : ''}
          />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Options & Status Bar */}
      <div className="filters-row">
        <div className="connector-pills" role="radiogroup" aria-label="Filter by connector type">
          <span className="filter-label">
            <Filter size={13} />
            Connectors:
          </span>
          {connectorTypes.map((c) => {
            const isSelected = selectedConnector === c.id;
            return (
              <button
                key={c.id}
                type="button"
                className={`filter-pill ${isSelected ? 'active' : ''}`}
                onClick={() => onConnectorChange(c.id)}
                role="radio"
                aria-checked={isSelected}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Availability Toggle */}
        <label className="available-toggle">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(e) => onToggleOnlyAvailable(e.target.checked)}
          />
          <span className="checkbox-custom">
            {onlyAvailable && <Check size={12} strokeWidth={3} />}
          </span>
          <span className="toggle-label">Available Only</span>
        </label>
      </div>

      {/* Polling & Result Stats Header */}
      <div className="results-status-bar">
        <span className="results-count">
          Showing <strong>{filteredCount}</strong> of <strong>{totalResultsCount}</strong> Bangalore stations
        </span>

        <span className="polling-meta">
          <span className="pulse-dot" />
          <span>Polled every 20s</span>
          {lastUpdatedTime && (
            <span className="last-updated">
              • Last updated {lastUpdatedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </span>
      </div>
    </div>
  );
};
