import { Navigate, Route, Routes } from 'react-router-dom';
import RevealPage from './pages/RevealPage.jsx';
import AddPlayer from './pages/AddPlayer.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RevealPage />} />
      <Route path="/add" element={<AddPlayer />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
