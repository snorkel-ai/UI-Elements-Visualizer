import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { DetailPage } from './pages/DetailPage';
import './App.css';

function App() {
  console.log('App component rendering');
  const basePath = import.meta.env.BASE_URL || '/';
  return (
    <BrowserRouter basename={basePath}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/detail/:folderName" element={<DetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
