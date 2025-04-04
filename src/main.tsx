
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
        <h2 className="font-bold">Database Connection Error</h2>
        <p>This application is designed to work with a MySQL database server. When running in a browser environment, it will use localStorage for demonstration.</p>
        <p>To use MySQL properly, you need to run this application with a backend server. For instructions, check the README file.</p>
      </div>
      <App />
    </React.StrictMode>
  );
});
