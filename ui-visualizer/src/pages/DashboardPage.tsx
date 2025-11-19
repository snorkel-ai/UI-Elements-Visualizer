import { useState, useEffect } from 'react';
import { DataPointTable } from '../components/DataPointTable';
import { loadDataPoints, extractComponentUsage, extractComponentNames } from '../utils/dataLoader';
import { formatFolderName } from '../utils/formatFolderName';
import { DataPoint } from '../types';
import { validateDataPoint, ValidationReport } from '../utils/validateComponents';

export function DashboardPage() {
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [filteredDataPoints, setFilteredDataPoints] = useState<DataPoint[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [componentFilter, setComponentFilter] = useState<string>('');
  const [validationResults, setValidationResults] = useState<Map<string, ValidationReport>>(new Map());
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        console.log('Fetching data points...');
        const points = await loadDataPoints();
        console.log('Loaded points:', points.length);
        setDataPoints(points);
        setFilteredDataPoints(points);
        
        // Run validation for all data points
        setValidating(true);
        const results = new Map<string, ValidationReport>();
        
        // Validate in batches to avoid overwhelming the browser
        const batchSize = 5;
        for (let i = 0; i < points.length; i += batchSize) {
          const batch = points.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (point) => {
              try {
                const report = await validateDataPoint(point);
                results.set(point.folderName, report);
              } catch (error) {
                console.error(`Error validating ${point.folderName}:`, error);
              }
            })
          );
          // Update state incrementally for better UX
          setValidationResults(new Map(results));
        }
        
        setValidating(false);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = dataPoints;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((point) => {
        const displayName = formatFolderName(point.folderName).toLowerCase();
        return displayName.includes(query) || point.folderName.toLowerCase().includes(query);
      });
    }

    if (componentFilter) {
      filtered = filtered.filter((point) => {
        if (!point.conversation) return false;
        const components = extractComponentNames(point.conversation);
        return components.includes(componentFilter);
      });
    }

    setFilteredDataPoints(filtered);
  }, [searchQuery, componentFilter, dataPoints]);

  const componentUsage = extractComponentUsage(dataPoints);
  const allComponents = Object.keys(componentUsage).sort();
  
  // Calculate validation statistics
  const validationStats = {
    total: dataPoints.length,
    passed: Array.from(validationResults.values()).filter(r => r.allPassed).length,
    failed: Array.from(validationResults.values()).filter(r => !r.allPassed).length,
    pending: dataPoints.length - validationResults.size
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading data...</p>
          <p className="text-xs text-gray-400 mt-2">Found {dataPoints.length} data points</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              UI Elements Visualizer
            </h1>
            {validationResults.size > 0 && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm font-semibold text-green-700">
                    {validationStats.passed} Pass All Checks
                  </span>
                </div>
                {validationStats.failed > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg border border-red-200">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-sm font-semibold text-red-700">
                      {validationStats.failed} Failed
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="sm:w-64">
              <select
                value={componentFilter}
                onChange={(e) => setComponentFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Components</option>
                {allComponents.map((component) => (
                  <option key={component} value={component}>
                    {component} ({componentUsage[component]})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
            <span>
              Showing {filteredDataPoints.length} of {dataPoints.length} data points
            </span>
            {validating && (
              <span className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                Validating...
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredDataPoints.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No data points found matching your criteria.</p>
          </div>
        ) : (
          <DataPointTable 
            dataPoints={filteredDataPoints} 
            validationResults={validationResults}
          />
        )}
      </main>
    </div>
  );
}
