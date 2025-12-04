import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import { DashboardPage } from './pages/DashboardPage';
import { DetailPage } from './pages/DetailPage';
import './App.css';

function App() {
  console.log('App component rendering');
  // Normalize base path for BrowserRouter - should start with / and not end with /
  let basePath = import.meta.env.BASE_URL || '/';
  // Remove trailing slash (except for root)
  if (basePath !== '/' && basePath.endsWith('/')) {
    basePath = basePath.slice(0, -1);
  }
  console.log('Base path:', basePath);
  console.log('Window location:', window.location.href);
  return (
    <DataProvider>
      <BrowserRouter basename={basePath}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/detail/:folderName" element={<DetailPage />} />
        </Routes>
      </BrowserRouter>
    </DataProvider>
  );
}

export default App;
