import { createContext, useContext, useState, ReactNode } from 'react';
import { DataPoint } from '../types';
import { ValidationReport } from '../utils/validateComponents';

interface DataContextType {
  dataPoints: DataPoint[];
  setDataPoints: (points: DataPoint[]) => void;
  hasCustomData: boolean;
  setHasCustomData: (has: boolean) => void;
  validationResults: Map<string, ValidationReport>;
  setValidationResults: (results: Map<string, ValidationReport>) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [hasCustomData, setHasCustomData] = useState(false);
  const [validationResults, setValidationResults] = useState<Map<string, ValidationReport>>(new Map());

  return (
    <DataContext.Provider value={{
      dataPoints,
      setDataPoints,
      hasCustomData,
      setHasCustomData,
      validationResults,
      setValidationResults
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataContext() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
}

