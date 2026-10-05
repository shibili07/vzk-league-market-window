import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { PlayersProvider } from './context/PlayersContext.jsx';
import './styles/tokens.css';
import './styles/app.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <PlayersProvider>
        <App />
      </PlayersProvider>
    </BrowserRouter>
  </React.StrictMode>
);
