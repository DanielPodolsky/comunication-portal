
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();

// ✅ THEN body parser
app.use(express.json());

app.use(cors({
  origin: 'http://localhost:8080', // 👈 MUST match your frontend exactly
  credentials: true                // 👈 REQUIRED for sending cookies/sessions
}));

import { initializeDatabase, pool } from './src/lib/mysql.js';
import { createUser, loginUser, getPackagesFromDB, createCustomer } from './src/lib/db.js';

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

app.post('/api/change-password', async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  try {
    const success = await changePassword(userId, currentPassword, newPassword);
    return res.json({ success });
  } catch (err) {
    console.error('Change password failed:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/request-password-reset', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  try {
    const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.json({ success: false, message: 'Email not found' });

    const user = users[0];
    const token = crypto.randomBytes(20).toString('hex');
    const expiry = Date.now() + 1000 * 60 * 10; // 10 minutes

    await pool.execute(
      'UPDATE users SET lastResetToken = ?, lastResetTokenExpiry = ? WHERE id = ?',
      [token, expiry, user.id]
    );

    // TODO: in production, send email. For demo, return token
    res.json({ success: true, token });
  } catch (err) {
    console.error('Error generating reset token:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post('/api/verify-reset-token', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, message: 'Token required' });

  try {
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE lastResetToken = ? AND lastResetTokenExpiry > ?',
      [token, Date.now()]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error verifying token:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ success: false, message: 'Token and password required' });
  }

  try {
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE lastResetToken = ? AND lastResetTokenExpiry > ?',
      [token, Date.now()]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = users[0];

    // Hash new password
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(newPassword, salt, 100000, 64, 'sha512').toString('hex');

    const newHistory = JSON.stringify([{ hash, createdAt: Date.now() }]);

    await pool.execute(`
      UPDATE users 
      SET passwordHash = ?, salt = ?, passwordHistory = ?, lastResetToken = NULL, lastResetTokenExpiry = NULL 
      WHERE id = ?
    `, [hash, salt, newHistory, user.id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get('/api/me', (req, res) => {
  // Optional: use cookies/session here
  res.json({
    success: true,
    user: {
      id: '123',
      username: 'demo_user',
      email: 'demo@example.com'
    }
  });
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
