import { useState, useEffect } from 'react';
import { DataPointTable } from '../components/DataPointTable';
import { FolderUpload } from '../components/FolderUpload';
import { LlmConfigPanel } from '../components/LlmConfigPanel';
import { useDataContext } from '../contexts/DataContext';
import { extractComponentUsage, extractComponentNames } from '../utils/dataLoader';
import { formatFolderName } from '../utils/formatFolderName';
import { DataPoint } from '../types';
import { validateDataPoint, ValidationReport } from '../utils/validateComponents';
import { calculateComplexity } from '../utils/calculateComplexity';
import { useRatings } from '../hooks/useRatings';

export function DashboardPage() {
  const {
    dataPoints: contextDataPoints,
    setDataPoints: setContextDataPoints,
    hasCustomData,
    setHasCustomData,
    validationResults,
    setValidationResults
  } = useDataContext();
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [filteredDataPoints, setFilteredDataPoints] = useState<DataPoint[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [componentFilter, setComponentFilter] = useState<string>('');
  const [complexityFilter, setComplexityFilter] = useState<string>('');
  const [validating, setValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState({ current: 0, total: 0 });
  const { updateRating, getRating } = useRatings();

  const loadData = async (points: DataPoint[]) => {
    // Calculate complexity for all data points
    const pointsWithComplexity = await Promise.all(
      points.map(async (point) => {
        try {
          const complexityAnalysis = await calculateComplexity(point);
          return {
            ...point,
            complexity: complexityAnalysis.level,
            complexityReason: complexityAnalysis.reason
          };
        } catch (error) {
          console.error(`Error calculating complexity for ${point.folderName}:`, error);
          return point;
        }
      })
    );

    setDataPoints(pointsWithComplexity);
    setFilteredDataPoints(pointsWithComplexity);
  };

  const runValidation = async () => {
    if (dataPoints.length === 0) return;

    setValidating(true);
    setValidationProgress({ current: 0, total: dataPoints.length });
    const results = new Map<string, ValidationReport>();

    // Validate sequentially for progress tracking
    for (let i = 0; i < dataPoints.length; i++) {
      const point = dataPoints[i];
      try {
        const report = await validateDataPoint(point);
        results.set(point.folderName, report);
        setValidationProgress({ current: i + 1, total: dataPoints.length });
        // Update results incrementally
        setValidationResults(new Map(results));
      } catch (error) {
        console.error(`Error validating ${point.folderName}:`, error);
      }
    }

    setValidating(false);
  };

  // Sync with context data when it changes
  useEffect(() => {
    if (contextDataPoints.length > 0 && hasCustomData) {
      loadData(contextDataPoints);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextDataPoints, hasCustomData]);

  const handleUpload = async (uploadedData: any[]) => {
    setLoading(true);
    setHasCustomData(true);
    try {
      // Convert uploaded data to DataPoint format if needed
      const points = uploadedData as DataPoint[];
      console.log('Loaded uploaded data points:', points.length);
      setContextDataPoints(points);
      await loadData(points);
    } catch (error) {
      console.error('Error processing uploaded data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setContextDataPoints([]);
    setHasCustomData(false);
    setDataPoints([]);
    setFilteredDataPoints([]);
    setValidationResults(new Map());
    setSearchQuery('');
    setComponentFilter('');
  };

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

    if (complexityFilter) {
      filtered = filtered.filter((point) => {
        return point.complexity === complexityFilter;
      });
    }

    setFilteredDataPoints(filtered);
  }, [searchQuery, componentFilter, complexityFilter, dataPoints]);

  const componentUsage = extractComponentUsage(dataPoints);
  const allComponents = Object.keys(componentUsage).sort();
  
  // Calculate validation statistics - only for "Props match schema" check
  const validationStats = {
    total: dataPoints.length,
    passed: Array.from(validationResults.values()).filter(r => {
      const propsMatchCheck = r.results.find(result => result.check === 'Props match schema');
      const passed = propsMatchCheck && propsMatchCheck.passed === true;
      if (!propsMatchCheck) {
        console.warn('Props match schema check not found in validation results. Available checks:', r.results.map(res => res.check));
      }
      return passed;
    }).length,
    failed: Array.from(validationResults.values()).filter(r => {
      const propsMatchCheck = r.results.find(result => result.check === 'Props match schema');
      return propsMatchCheck && propsMatchCheck.passed === false;
    }).length,
    pending: dataPoints.length - validationResults.size
  };

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
                        {validationStats.passed} Pass Props Match Schema
                      </span>
                    </div>
                    {validationStats.failed > 0 && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg border border-red-200">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-sm font-semibold text-red-700">
                          {validationStats.failed} Failed Props Match Schema
                        </span>
                      </div>
                    )}
                  </div>
                )}
          </div>
          
          <FolderUpload
            onUpload={handleUpload}
            onReset={handleReset}
            hasCustomData={hasCustomData}
          />

          {dataPoints.length > 0 && (
            <div className="mt-4">
              <LlmConfigPanel onConfigChange={() => {
                // Config changed - validation can be re-run via button
              }} />

              <div className="mt-4 border border-gray-300 rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">Validation</h3>
                    <p className="text-xs text-gray-600 mt-1">Run validation checks on all data points</p>
                  </div>
                  <button
                    onClick={runValidation}
                    disabled={validating || dataPoints.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {validating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Running...
                      </>
                    ) : (
                      <>Run Validation</>
                    )}
                  </button>
                </div>

                {validating && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Progress: {validationProgress.current} / {validationProgress.total}</span>
                      <span>{Math.round((validationProgress.current / validationProgress.total) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(validationProgress.current / validationProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {dataPoints.length === 0 && !loading && (
            <div className="mt-8 p-8 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <p className="text-blue-800 font-medium mb-2">No data loaded</p>
              <p className="text-blue-600 text-sm">Upload a JSON file containing folder data points to get started.</p>
            </div>
          )}
          
          {dataPoints.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="sm:w-48">
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
              
              <div className="sm:w-40">
                <select
                  value={complexityFilter}
                  onChange={(e) => setComplexityFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Complexity</option>
                  <option value="simple">Simple</option>
                  <option value="complex">Complex</option>
                </select>
              </div>
            </div>
          )}
          
          {dataPoints.length > 0 && (
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
          )}
        </div>
      </header>

      {dataPoints.length > 0 && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {filteredDataPoints.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No data points found matching your criteria.</p>
            </div>
          ) : (
            <DataPointTable 
              dataPoints={filteredDataPoints} 
              validationResults={validationResults}
              getRating={getRating}
              updateRating={updateRating}
            />
          )}
        </main>
      )}
    </div>
  );
}
