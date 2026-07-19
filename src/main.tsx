import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// --- API Standard Response Compatibility Layer ---
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const response = await originalFetch(...args);
  const originalJson = response.json;
  response.json = async function () {
    const data = await originalJson.call(this);
    if (data && typeof data === "object") {
      if (data.success === true && "data" in data) {
        return data.data;
      }
      if (data.success === false && data.error) {
        return {
          ...data,
          error: typeof data.error === "object" ? data.error.message : data.error
        };
      }
    }
    return data;
  };
  return response;
};

createRoot(document.getElementById('root')!).render(

  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
