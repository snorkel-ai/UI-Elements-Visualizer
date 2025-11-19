import { ValidationReport } from '../utils/validateComponents';

interface ValidationReportProps {
  report: ValidationReport;
}

export function ValidationReportComponent({ report }: ValidationReportProps) {
  return (
    <div className={`rounded-lg border-2 p-4 mb-6 ${
      report.allPassed
        ? 'bg-green-50 border-green-300'
        : 'bg-red-50 border-red-300'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-3 h-3 rounded-full ${
          report.allPassed ? 'bg-green-500' : 'bg-red-500'
        }`} />
        <h2 className="text-lg font-semibold text-gray-900">
          Validation Report
        </h2>
        <span className={`text-sm font-medium ${
          report.allPassed ? 'text-green-700' : 'text-red-700'
        }`}>
          {report.allPassed ? 'All Checks Passed' : 'Some Checks Failed'}
        </span>
      </div>

      <div className="space-y-3">
        {report.results.map((result, idx) => (
          <div
            key={idx}
            className={`p-3 rounded border ${
              result.passed
                ? 'bg-white border-green-200'
                : 'bg-white border-red-200'
            }`}
          >
            <div className="flex items-start gap-2">
              <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                result.passed ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {result.passed ? (
                  <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900 mb-1">
                  {result.check}
                </div>
                <div className={`text-sm ${
                  result.passed ? 'text-green-700' : 'text-red-700'
                }`}>
                  {result.message}
                </div>
                {result.details && result.details.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900">
                      Show details ({result.details.length})
                    </summary>
                    <ul className="mt-2 ml-4 space-y-1">
                      {result.details.map((detail, detailIdx) => (
                        <li key={detailIdx} className="text-xs text-gray-700 font-mono">
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

