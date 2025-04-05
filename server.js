
import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './src/lib/mysql';

const app = express();

app.use(cors());
app.use(express.json());

// Initialize database
initializeDatabase().then(() => {
  console.log('Database initialized successfully');
}).catch(err => {
  console.error('Failed to initialize database:', err);
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
