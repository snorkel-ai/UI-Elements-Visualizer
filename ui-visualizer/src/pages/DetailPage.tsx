import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { DataPoint } from '../types';
import { loadDataPoints } from '../utils/dataLoader';
import { extractComponentNames } from '../utils/dataLoader';
import { formatFolderName, extractDateFromFolderName, formatDate } from '../utils/formatFolderName';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { parseComponents, ParsedComponent } from '../utils/parseComponents';
import { ComponentDefinitionCard } from '../components/ComponentDefinitionCard';
import { validateComponents, ValidationReport } from '../utils/validateComponents';
import { ValidationReportComponent } from '../components/ValidationReport';

export function DetailPage() {
  const { folderName } = useParams<{ folderName: string }>();
  const navigate = useNavigate();
  const [dataPoint, setDataPoint] = useState<DataPoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [componentsContent, setComponentsContent] = useState<string>('');
  const [parsedComponents, setParsedComponents] = useState<ParsedComponent[]>([]);
  const [highlightedComponent, setHighlightedComponent] = useState<string | null>(null);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const points = await loadDataPoints();
        const point = points.find(p => p.folderName === decodeURIComponent(folderName || ''));
        setDataPoint(point || null);
        
        if (point?.componentsPath) {
          try {
            // Handle base path for GitHub Pages
            const basePath = import.meta.env.BASE_URL || '/';
            const componentsPath = point.componentsPath.startsWith('/') 
              ? `${basePath}${point.componentsPath.slice(1)}`.replace(/\/+/g, '/')
              : `${basePath}${point.componentsPath}`.replace(/\/+/g, '/');
            const response = await fetch(componentsPath);
            if (response.ok) {
              const text = await response.text();
              setComponentsContent(text);
              const parsed = parseComponents(text);
              setParsedComponents(parsed);
              
              // Run validation
              if (point) {
                const report = validateComponents(point, parsed, text);
                setValidationReport(report);
              }
            }
          } catch (e) {
            console.error('Error loading components.ts:', e);
          }
        } else if (point) {
          // Run validation even without components.ts
          const report = validateComponents(point, [], '');
          setValidationReport(report);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [folderName]);

  // Inject highlighting script into iframe and send highlight messages
  useEffect(() => {
    if (!iframeRef.current || !dataPoint?.canvasHtml) return;

    const iframe = iframeRef.current;
    
    // Wait for iframe to load
    const handleLoad = () => {
      try {
        const iframeWindow = iframe.contentWindow;
        if (!iframeWindow) return;

        // Inject highlighting script into iframe
        const script = iframeWindow.document.createElement('script');
        script.textContent = `
          (function() {
            let highlightedElements = [];
            
            function clearHighlights() {
              highlightedElements.forEach(el => {
                el.style.outline = '';
                el.style.outlineOffset = '';
                el.style.transition = '';
                el.classList.remove('component-highlight');
              });
              highlightedElements = [];
            }
            
            function highlightComponent(componentName) {
              clearHighlights();
              
              if (!componentName) return;
              
              // Try multiple strategies to find components
              const strategies = [
                // Strategy 1: Look for elements with component name in class/id/data attributes
                function() {
                  const nameLower = componentName.toLowerCase();
                  const selectors = [
                    '[data-component*="' + nameLower + '"]',
                    '[class*="' + nameLower + '"]',
                    '[id*="' + nameLower + '"]',
                  ];
                  const elements = [];
                  selectors.forEach(sel => {
                    try {
                      elements.push(...document.querySelectorAll(sel));
                    } catch(e) {}
                  });
                  return elements;
                },
                // Strategy 2: Search text content for component names
                function() {
                  const allElements = document.querySelectorAll('*');
                  const matches = [];
                  const nameLower = componentName.toLowerCase();
                  allElements.forEach(el => {
                    const text = el.textContent || '';
                    const className = el.className || '';
                    const id = el.id || '';
                    if (
                      (text.toLowerCase().includes(nameLower) && text.length < 100) ||
                      className.toLowerCase().includes(nameLower) ||
                      id.toLowerCase().includes(nameLower)
                    ) {
                      // Check if it's likely a component container (has children, reasonable size)
                      if (el.children.length > 0 || el.offsetHeight > 50) {
                        matches.push(el);
                      }
                    }
                  });
                  return matches.slice(0, 5); // Limit to first 5 matches
                },
                // Strategy 3: Look for React component containers (common patterns)
                function() {
                  const root = document.getElementById('root');
                  if (!root) return [];
                  
                  // Walk through React-rendered structure
                  const walker = document.createTreeWalker(
                    root,
                    NodeFilter.SHOW_ELEMENT,
                    null
                  );
                  
                  const matches = [];
                  let node;
                  while (node = walker.nextNode()) {
                    const el = node;
                    // Look for divs that might contain components
                    if (el.tagName === 'DIV' && el.children.length > 0) {
                      const text = el.textContent || '';
                      const nameLower = componentName.toLowerCase();
                      if (text.toLowerCase().includes(nameLower) && el.offsetHeight > 30) {
                        matches.push(el);
                      }
                    }
                  }
                  return matches.slice(0, 3);
                }
              ];
              
              let found = [];
              for (let i = 0; i < strategies.length; i++) {
                found = strategies[i]();
                if (found.length > 0) break;
              }
              
              // Highlight found elements
              found.forEach(el => {
                el.style.outline = '3px solid #3b82f6';
                el.style.outlineOffset = '2px';
                el.style.transition = 'outline 0.2s ease';
                el.classList.add('component-highlight');
                highlightedElements.push(el);
                
                // Scroll into view
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              });
            }
            
            // Listen for messages from parent
            window.addEventListener('message', (event) => {
              if (event.data && event.data.type === 'highlight-component') {
                highlightComponent(event.data.componentName);
              } else if (event.data && event.data.type === 'clear-highlight') {
                clearHighlights();
              }
            });
            
            // Also expose function for direct calls
            window.highlightComponent = highlightComponent;
            window.clearHighlights = clearHighlights;
          })();
        `;
        
        iframeWindow.document.head.appendChild(script);
      } catch (e) {
        console.error('Error injecting script into iframe:', e);
      }
    };

    iframe.addEventListener('load', handleLoad);
    
    // If iframe is already loaded
    if (iframe.contentDocument?.readyState === 'complete') {
      handleLoad();
    }

    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
  }, [dataPoint?.canvasHtml]);

  // Send highlight message to iframe when highlightedComponent changes
  useEffect(() => {
    if (!iframeRef.current) return;

    try {
      const iframeWindow = iframeRef.current.contentWindow;
      if (iframeWindow) {
        if (highlightedComponent) {
          // Small delay to ensure iframe script is ready
          setTimeout(() => {
            iframeWindow.postMessage(
              { type: 'highlight-component', componentName: highlightedComponent },
              '*'
            );
          }, 100);
        } else {
          iframeWindow.postMessage(
            { type: 'clear-highlight' },
            '*'
          );
        }
      }
    } catch (e) {
      console.error('Error sending message to iframe:', e);
    }
  }, [highlightedComponent]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!dataPoint) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Data Point Not Found</h1>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const componentNames = dataPoint.conversation 
    ? extractComponentNames(dataPoint.conversation)
    : [];
  
  const displayName = formatFolderName(dataPoint.folderName);
  const date = extractDateFromFolderName(dataPoint.folderName);

  // Match parsed components with used component names
  const usedComponents = parsedComponents.filter(comp => 
    componentNames.some(name => 
      name.toLowerCase() === comp.name.toLowerCase() ||
      comp.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(comp.name.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-700 mb-2 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {displayName}
              </h1>
              {date && (
                <p className="text-sm text-gray-500 mt-1">
                  {formatDate(date)}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Fixed Canvas on Left */}
            {dataPoint.canvasHtml && (() => {
              // Handle base path for GitHub Pages
              const basePath = import.meta.env.BASE_URL || '/';
              const canvasPath = dataPoint.canvasHtml.startsWith('/')
                ? `${basePath}${dataPoint.canvasHtml.slice(1)}`.replace(/\/+/g, '/')
                : `${basePath}${dataPoint.canvasHtml}`.replace(/\/+/g, '/');
              return (
              <div className="w-1/2 border-r border-gray-300 flex flex-col bg-white">
                <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-sm font-semibold text-gray-700">Canvas Preview</h2>
                </div>
                <div className="flex-1 overflow-hidden relative">
                  <iframe
                    ref={iframeRef}
                    src={canvasPath}
                className="w-full h-full border-0"
                title="Canvas Preview"
                sandbox="allow-scripts allow-same-origin"
              />
              {highlightedComponent && (
                    <div className="absolute top-2 left-2 bg-blue-600 text-white px-3 py-1 rounded-md text-xs font-semibold shadow-lg z-10">
                      Highlighting: {highlightedComponent}
                    </div>
                  )}
                </div>
              </div>
              );
            })()}

        {/* Scrollable Content on Right */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Validation Report */}
            {validationReport && (
              <ValidationReportComponent report={validationReport} />
            )}

            {componentNames.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Components Used</h2>
                <div className="flex flex-wrap gap-2">
                  {componentNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => setHighlightedComponent(name)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        highlightedComponent === name
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Component Definitions */}
            {usedComponents.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Component Definitions
                </h2>
                <div className="space-y-4">
                  {usedComponents.map((component) => {
                    const isHighlighted = componentNames.some(name => 
                      name.toLowerCase() === component.name.toLowerCase() ||
                      component.name.toLowerCase().includes(name.toLowerCase())
                    ) && highlightedComponent && (
                      component.name.toLowerCase().includes(highlightedComponent.toLowerCase()) ||
                      highlightedComponent.toLowerCase().includes(component.name.toLowerCase())
                    );
                    
                    // Find matching component name from conversation
                    const matchingName = componentNames.find(name => 
                      name.toLowerCase() === component.name.toLowerCase() ||
                      component.name.toLowerCase().includes(name.toLowerCase()) ||
                      name.toLowerCase().includes(component.name.toLowerCase())
                    ) || component.name;

                    return (
                      <ComponentDefinitionCard
                        key={component.name}
                        component={component}
                        isHighlighted={isHighlighted || false}
                        onClick={() => {
                          const nameToHighlight = matchingName;
                          setHighlightedComponent(
                            highlightedComponent === nameToHighlight ? null : nameToHighlight
                          );
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {dataPoint.conversation && (
              <CollapsibleSection title="Conversation" defaultOpen={false}>
                <div className="space-y-4">
                  {dataPoint.conversation.conversation?.map((message: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-blue-50 border-l-4 border-blue-500'
                          : 'bg-gray-50 border-l-4 border-gray-400'
                      }`}
                    >
                      <div className="text-xs font-semibold text-gray-600 mb-2 uppercase">
                        {message.role}
                      </div>
                      {Array.isArray(message.content) ? (
                        <div className="space-y-2">
                          {message.content.map((item: any, itemIdx: number) => (
                            <div key={itemIdx}>
                              {item.type === 'text' && (
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                  {item.text}
                                </p>
                              )}
                              {item.type === 'component' && (
                                <div 
                                  className="mt-2 p-2 bg-white rounded border border-gray-200 cursor-pointer hover:border-blue-400 transition-colors"
                                  onClick={() => setHighlightedComponent(item.component.name)}
                                >
                                  <div className="text-xs font-semibold text-blue-600 mb-1">
                                    Component: {item.component.name}
                                  </div>
                                  <pre className="text-xs text-gray-600 overflow-x-auto">
                                    {JSON.stringify(item.component.props, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-800">{message.content}</p>
                      )}
                      
                      {message.role === 'assistant' && message.grading_guidance && (
                        <div className="mt-4 pt-4 border-t border-gray-300">
                          <details className="group">
                            <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-2">
                              <svg
                                className="w-4 h-4 transition-transform group-open:rotate-90"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              Grading Guidance
                            </summary>
                            <div className="mt-3 space-y-3 pl-6">
                              {message.grading_guidance.quality_criteria && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Quality Criteria</h4>
                                  <ul className="list-disc list-inside space-y-1">
                                    {message.grading_guidance.quality_criteria.map((criterion: string, i: number) => (
                                      <li key={i} className="text-xs text-gray-600">{criterion}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {message.grading_guidance.expected_components && message.grading_guidance.expected_components.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Expected Components</h4>
                                  <div className="flex flex-wrap gap-1">
                                    {message.grading_guidance.expected_components.map((component: string, i: number) => (
                                      <span
                                        key={i}
                                        className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded"
                                      >
                                        {component}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {message.grading_guidance.tool_accuracy && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-700 mb-1">Tool Accuracy</h4>
                                  <p className="text-xs text-gray-600">{message.grading_guidance.tool_accuracy}</p>
                                </div>
                              )}
                              
                              {message.grading_guidance.response_completeness && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-700 mb-1">Response Completeness</h4>
                                  <p className="text-xs text-gray-600">{message.grading_guidance.response_completeness}</p>
                                </div>
                              )}
                              
                              {message.grading_guidance.component_relevance && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-700 mb-1">Component Relevance</h4>
                                  <p className="text-xs text-gray-600">{message.grading_guidance.component_relevance}</p>
                                </div>
                              )}
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {componentsContent && (
              <CollapsibleSection title="Full Components Definition" defaultOpen={false}>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm max-h-96 overflow-y-auto">
                  <code>{componentsContent}</code>
                </pre>
              </CollapsibleSection>
            )}

            {dataPoint.conversation && (
              <CollapsibleSection title="Raw Conversation JSON" defaultOpen={false}>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
                  <code>{JSON.stringify(dataPoint.conversation, null, 2)}</code>
                </pre>
              </CollapsibleSection>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
