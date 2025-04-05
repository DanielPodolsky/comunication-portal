
import express from 'express';
import cors from 'cors';
import { initializeDatabase, pool } from './src/lib/mysql.js';
import { createUser, loginUser, getPackagesFromDB, createCustomer } from './src/lib/db.js';
import crypto from 'crypto';

const app = express();

app.use(cors());
app.use(express.json());

// Generate UUID - helper function for the server
const generateUUID = () => {
  return crypto.randomUUID();
};

// Initialize database
initializeDatabase().then(() => {
  console.log('Database initialized successfully');
}).catch(err => {
  console.error('Failed to initialize database:', err);
});

// API Routes
// Get all packages
app.get('/api/packages', async (req, res) => {
  try {
    const packages = await getPackagesFromDB();
    res.json({ success: true, packages });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch packages' });
  }
});

// User registration endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    const user = await createUser(username, email, password);
    
    if (user) {
      // Don't return sensitive data like passwordHash
      const { passwordHash, salt, passwordHistory, ...safeUser } = user;
      return res.json({ success: true, user: safeUser });
    } else {
      return res.status(409).json({ success: false, message: 'Username or email already exists' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
});

// User login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    const user = await loginUser(username, password);
    
    if (user) {
      // Don't return sensitive data
      const { passwordHash, salt, passwordHistory, ...safeUser } = user;
      return res.json({ success: true, user: safeUser });
    } else {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
});

// Customer creation endpoint
app.post('/api/customers', async (req, res) => {
  try {
    const { name, email, phone, address, packageId, userId } = req.body;
    
    if (!name || !email || !phone || !address || !packageId || !userId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    const customer = await createCustomer({ name, email, phone, address, packageId, userId });
    
    if (customer) {
      return res.json({ success: true, customer });
    } else {
      return res.status(500).json({ success: false, message: 'Failed to create customer' });
    }
  } catch (error) {
    console.error('Customer creation error:', error);
    res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
});

// Get customers by user ID
app.get('/api/customers/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }
    
    // Use a direct query since we're importing pool
    const [rows] = await pool.execute('SELECT * FROM customers WHERE userId = ?', [userId]);
    
    return res.json({ success: true, customers: rows });
  } catch (error) {
    console.error('Fetch customers error:', error);
    res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
