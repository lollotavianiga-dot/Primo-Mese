import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const renderApp = async () => {
  const host = window.location.hostname;
  const path = window.location.pathname;
  let domainId: string | null = null;
  
  if (path.startsWith('/site/')) {
    domainId = path.split('/')[2];
  } else if (!host.includes('localhost') && !host.includes('vercel.app') && !host.includes('run.app')) {
    // Basic catch for custom subdomain logic on other hosts
    domainId = host.split('.')[0];
    if (domainId === 'www') domainId = host.replace('www.', '');
  }

  if (domainId) {
    try {
      const pDoc = await getDoc(doc(db, 'projects', domainId));
      if (pDoc.exists()) {
        const data = pDoc.data();
        document.documentElement.innerHTML = data.bundledContent;
        // Re-execute scripts that might have been in the bundledContent
        const scripts = document.querySelectorAll('script');
        scripts.forEach(oldScript => {
          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
          newScript.textContent = oldScript.textContent;
          oldScript.parentNode?.replaceChild(newScript, oldScript);
        });
        return; // Don't render the IDE
      }
    } catch (e) {
      console.error("Failed to load deployed site:", e);
    }
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

renderApp();