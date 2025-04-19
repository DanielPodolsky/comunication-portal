import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

// Temporary in-memory token store (for demo)
// Replace with a database table for production
const resetTokens = {};


// ✅ THEN body parser
app.use(express.json());

app.use(cors({
  origin: 'http://localhost:8080', // 👈 MUST match your frontend exactly
  credentials: true                // 👈 REQUIRED for sending cookies/sessions
}));

import { initializeDatabase, pool } from './src/lib/mysql.js';
import { createUser, loginUser, loginUserVulnerable, getPackagesFromDB, createCustomer, createCustomerVulnerable } from './src/lib/db.js';

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
    const { username, password, secureMode } = req.body;
    console.log('🔑 Login attempt:', { username, password, secureMode });

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const user = secureMode
      ? await loginUser(username, password)
      : await loginUserVulnerable(username, password);

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

app.post('/api/logout', (req, res) => {
  // Optional: clear session/cookies here
  res.json({ success: true, message: 'Logged out successfully' });
});

// Customer creation endpoint
app.post('/api/customers', async (req, res) => {
  try {
    const { name, email, phone, address, packageId, userId, secureMode } = req.body;

    if (!name || !email || !phone || !address || !packageId || !userId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const customer = secureMode
      ? await createCustomer({ name, email, phone, address, packageId, userId })
      : await createCustomerVulnerable({ name, email, phone, address, packageId, userId });


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

    // Generate a random value
    const rawToken = crypto.randomBytes(16).toString('hex');

    // Hash the token using SHA-1 algorithm as required
    const hashedToken = crypto
      .createHash('sha1')
      .update(rawToken)
      .digest('hex');

    const expiry = Date.now() + 1000 * 60 * 60; // 1 hour expiry

    // Store the SHA-1 hashed token in the database
    await pool.execute(
      'UPDATE users SET lastResetToken = ?, lastResetTokenExpiry = ? WHERE id = ?',
      [hashedToken, expiry, user.id]
    );

    // In a real implementation, send the raw token to user's email
    // For demo purposes, return both tokens (in production, only return success)

    const emailConfig = {
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    };

    const transporter = nodemailer.createTransport(emailConfig);

    await transporter.sendMail({
      to: email,
      subject: 'שכח סיסמא - קוד איפוס',
      html: `
        <h2>שכח סיסמא</h2>
        <p>הערך האקראי שלך הוא:</p>
        <h3>${rawToken}</h3>
        <p>קוד זה תקף למשך שעה אחת.</p>
      `
    });

    res.json({
      success: true,
      message: 'Reset token has been sent to your email',
    });
  } catch (err) {
    console.error('Error generating reset token:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post('/api/verify-reset-token', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, message: 'Token required' });

  try {
    // Hash the user provided token using SHA-1
    const hashedUserToken = crypto
      .createHash('sha1')
      .update(token)
      .digest('hex');

    // Look up the hashed token in the database
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE lastResetToken = ? AND lastResetTokenExpiry > ?',
      [hashedUserToken, Date.now()]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    res.json({
      success: true,
      userId: users[0].id
    });
  } catch (err) {
    console.error('Error verifying token:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Modified reset password endpoint to use PBKDF2 properly
app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword, userId } = req.body;

  // Validate all required fields
  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Reset token is required'
    });
  }

  if (!newPassword) {
    return res.status(400).json({
      success: false,
      message: 'New password is required'
    });
  }

  // Make userId optional - look it up by token if not provided
  let targetUserId = userId;

  try {
    // Hash the user provided token using SHA-1 for verification
    const hashedUserToken = crypto
      .createHash('sha1')
      .update(token)
      .digest('hex');

    // If userId not provided, look it up by token
    if (!targetUserId) {
      const [users] = await pool.execute(
        'SELECT id FROM users WHERE lastResetToken = ? AND lastResetTokenExpiry > ?',
        [hashedUserToken, Date.now()]
      );

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      targetUserId = users[0].id;
      console.log(`Found userId ${targetUserId} for reset token`);
    }

    // Look up the user with the hashed token
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE id = ? AND lastResetToken = ? AND lastResetTokenExpiry > ?',
      [targetUserId, hashedUserToken, Date.now()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token for this user'
      });
    }

    const user = users[0];

    // Generate a new salt
    const salt = crypto.randomBytes(16).toString('hex');

    // Use SHA-1 for password hashing, matching the format in loginUser function
    const hash = crypto
      .createHash('sha1')
      .update(newPassword + salt) // password first, then salt
      .digest('hex');

    console.log('Reset Password - Debug Information:');
    console.log('New Password:', newPassword);
    console.log('Generated Salt:', salt);
    console.log('Generated Hash:', hash);

    // Create password history or update existing one
    let passwordHistory = [];
    if (user.passwordHistory) {
      try {
        passwordHistory = JSON.parse(user.passwordHistory);
      } catch (e) {
        console.warn('Invalid password history format, resetting');
      }
    }

    passwordHistory.unshift({ hash, createdAt: Date.now() });
    const newHistory = JSON.stringify(passwordHistory);

    // Update user record with SHA-1 hashed password
    await pool.execute(`
      UPDATE users 
      SET passwordHash = ?, salt = ?, passwordHistory = ?, lastResetToken = NULL, lastResetTokenExpiry = NULL 
      WHERE id = ?
    `, [hash, salt, newHistory, user.id]);

    console.log(`Password reset successfully for user ${user.id} using SHA-1`);
    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message
    });
  }
});
app.get('/api/me', (req, res) => {
  if (req.session && req.session.user) {
    res.json({
      success: true,
      user: req.session.user
    });
  } else {
    res.status(401).json({ success: false, message: 'Not logged in' });
  }
});


// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
