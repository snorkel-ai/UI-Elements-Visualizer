import { DataPoint } from '../types';
import { extractComponentNames } from '../utils/dataLoader';
import { formatFolderName, extractDateFromFolderName, formatDate } from '../utils/formatFolderName';
import { useNavigate } from 'react-router-dom';
import { ValidationReport } from '../utils/validateComponents';

interface DataPointTableProps {
  dataPoints: DataPoint[];
  validationResults?: Map<string, ValidationReport>;
  startIndex?: number;
}

export function DataPointTable({ dataPoints, validationResults, startIndex = 0 }: DataPointTableProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
              #
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Messages
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Components
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Complexity
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Validation
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {dataPoints.map((point, index) => {
            const componentNames = point.conversation 
              ? extractComponentNames(point.conversation)
              : [];
            const conversationCount = point.conversation?.conversation?.length || 0;
            const displayName = formatFolderName(point.folderName);
            const date = extractDateFromFolderName(point.folderName);
            const validation = validationResults?.get(point.folderName);
            const rowNumber = startIndex + index + 1;

            return (
              <tr
                key={point.folderName}
                onClick={() => navigate(`/detail/${encodeURIComponent(point.folderName)}`)}
                className="hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-500">
                    {rowNumber}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {displayName}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {date ? formatDate(date) : '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {conversationCount}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {componentNames.slice(0, 3).map((name) => (
                      <span
                        key={name}
                        className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded"
                      >
                        {name}
                      </span>
                    ))}
                    {componentNames.length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        +{componentNames.length - 3}
                      </span>
                    )}
                    {componentNames.length === 0 && (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {point.complexity ? (
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        point.complexity === 'simple'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                      title={point.complexityReason}
                    >
                      {point.complexity === 'simple' ? 'Simple' : 'Complex'}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {validation ? (() => {
                    // Only show "Props match schema" check
                    const propsMatchCheck = validation.results.find(r => r.check === 'Props match schema');
                    if (!propsMatchCheck) {
                      // Debug: log if check not found
                      console.warn(`Props match schema check not found for ${point.folderName}. Available checks:`, validation.results.map(r => r.check));
                      return <span className="text-xs text-gray-400" title="Validation pending or check not found">-</span>;
                    }
                    return (
                      <div className="flex items-center gap-2">
                        {propsMatchCheck.passed === true ? (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-xs text-green-700 font-medium">Pass</span>
                          </div>
                        ) : propsMatchCheck.passed === false ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-red-500"></div>
                              <span className="text-xs text-red-700 font-medium">Failed</span>
                            </div>
                            <div className="text-xs text-gray-600">
                              {propsMatchCheck.check}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    );
                  })() : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
