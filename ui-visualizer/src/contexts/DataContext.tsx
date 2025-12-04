import { createContext, useContext, useState, ReactNode } from 'react';
import { DataPoint } from '../types';

interface DataContextType {
  dataPoints: DataPoint[];
  setDataPoints: (points: DataPoint[]) => void;
  hasCustomData: boolean;
  setHasCustomData: (has: boolean) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [hasCustomData, setHasCustomData] = useState(false);

  return (
    <DataContext.Provider value={{ dataPoints, setDataPoints, hasCustomData, setHasCustomData }}>
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

