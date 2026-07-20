import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// --- API Standard Response Compatibility Layer ---
const originalFetch = window.fetch;
Object.defineProperty(window, 'fetch', {
  value: async function (input: RequestInfo | URL, init?: RequestInit) {
    const newInit: RequestInit = { ...init };
    const urlString = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input as Request).url);
    if (urlString.startsWith('/') || urlString.startsWith(window.location.origin)) {
      newInit.credentials = 'include';
    }
    const response = await originalFetch(input, newInit);
    if (response.status === 401 && !urlString.includes("/auth/me") && !urlString.includes("/auth/login")) {
      window.dispatchEvent(new CustomEvent("nhs-session-expired"));
    }
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
  },
  configurable: true,
  writable: true
});

createRoot(document.getElementById('root')!).render(

  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
