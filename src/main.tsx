
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { setupDatabase } from './lib/initDb';

// Initialize the database before rendering the app
setupDatabase().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}).catch(error => {
  console.error('Error setting up the application:', error);
  // Still render the app, but it might not work correctly
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <div className="p-4 bg-red-100 text-red-700 rounded mb-4">
        <h2 className="font-bold">Database Error</h2>
        <p>Failed to connect to the database. Please check your MySQL connection settings.</p>
      </div>
      <App />
    </React.StrictMode>
  );
});
