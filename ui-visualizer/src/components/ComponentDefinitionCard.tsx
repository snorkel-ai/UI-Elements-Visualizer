import { ParsedComponent } from '../utils/parseComponents';

interface ComponentDefinitionCardProps {
  component: ParsedComponent;
  isHighlighted?: boolean;
  onClick?: () => void;
}

export function ComponentDefinitionCard({ component, isHighlighted, onClick }: ComponentDefinitionCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border-2 p-4 transition-all cursor-pointer ${
        isHighlighted
          ? 'border-blue-500 shadow-lg bg-blue-50'
          : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
      }`}
    >
      <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-mono">
          {component.name}
        </span>
        {isHighlighted && (
          <span className="text-xs text-blue-600">● Active</span>
        )}
      </h3>
      
      {component.props.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Properties</div>
          <div className="space-y-1">
            {component.props.slice(0, 5).map((prop, idx) => (
              <div key={idx} className="text-xs text-gray-700">
                <span className="font-mono text-blue-600">{prop.name}</span>
                {prop.optional && <span className="text-gray-400">?</span>}
                <span className="text-gray-500">: </span>
                <span className="font-mono text-gray-600">{prop.type}</span>
                {prop.description && (
                  <div className="text-gray-500 text-xs mt-0.5 ml-2">{prop.description}</div>
                )}
              </div>
            ))}
            {component.props.length > 5 && (
              <div className="text-xs text-gray-400 italic">
                +{component.props.length - 5} more properties
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

