
import { pool } from './mysql';
import crypto from 'crypto';

// Initialize the database on module load
export const initDatabase = async () => {
  const { initializeDatabase } = await import('./mysql');
  await initializeDatabase();
};

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  passwordHistory: string[];
  lastResetToken?: string;
  lastResetTokenExpiry?: number;
  failedLoginAttempts: number;
  locked: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  packageId: string;
  userId: string;
}

export interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
  speed: number;
  features: string[];
}

// Generate a secure random string
const generateRandomString = (length = 16) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate UUID
const generateUUID = () => {
  return crypto.randomUUID();
};

// Hash password using Node.js crypto
export const hashPassword = async (password: string, salt?: string): Promise<{ hash: string, salt: string }> => {
  const generatedSalt = salt || generateRandomString(16);
  
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, generatedSalt, 1000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve({
        hash: derivedKey.toString('hex'),
        salt: generatedSalt
      });
    });
  });
};

// Generate token for password reset
export const generateResetToken = async (): Promise<string> => {
  return crypto.randomBytes(20).toString('hex');
};

// User Services (Vulnerable Version)
export const createUserVulnerable = async (username: string, email: string, password: string): Promise<User | null> => {
  try {
    // This is vulnerable to SQL injection in a real database
    const [rows] = await pool.execute(
      `SELECT * FROM users WHERE username = '${username}' OR email = '${email}'`
    );
    
    if ((rows as any[]).length > 0) {
      return null;
    }
    
    const { hash, salt } = await hashPassword(password);
    const id = generateUUID();
    const passwordHistory = JSON.stringify([hash]);
    
    await pool.execute(
      `INSERT INTO users (id, username, email, passwordHash, salt, passwordHistory, failedLoginAttempts, locked) 
       VALUES ('${id}', '${username}', '${email}', '${hash}', '${salt}', '${passwordHistory}', 0, false)`
    );
    
    return {
      id,
      username,
      email,
      passwordHash: hash,
      salt,
      passwordHistory: [hash],
      failedLoginAttempts: 0,
      locked: false
    };
  } catch (error) {
    console.error('Failed to create user:', error);
    return null;
  }
};

// User Services (Secure Version)
export const createUser = async (username: string, email: string, password: string): Promise<User | null> => {
  try {
    // Secure way with parameterized query
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username.trim(), email.trim()]
    );
    
    if ((rows as any[]).length > 0) {
      return null;
    }
    
    const { hash, salt } = await hashPassword(password);
    const id = generateUUID();
    const passwordHistory = JSON.stringify([hash]);
    
    await pool.execute(
      `INSERT INTO users (id, username, email, passwordHash, salt, passwordHistory, failedLoginAttempts, locked) 
       VALUES (?, ?, ?, ?, ?, ?, 0, false)`,
      [id, username.trim(), email.trim(), hash, salt, passwordHistory]
    );
    
    return {
      id,
      username: username.trim(),
      email: email.trim(),
      passwordHash: hash,
      salt,
      passwordHistory: [hash],
      failedLoginAttempts: 0,
      locked: false
    };
  } catch (error) {
    console.error('Failed to create user:', error);
    return null;
  }
};

// Vulnerable login
export const loginUserVulnerable = async (username: string, password: string): Promise<User | null> => {
  try {
    // This is vulnerable to SQL injection in a real database
    const [rows] = await pool.execute(
      `SELECT * FROM users WHERE username = '${username}'`
    );
    
    if ((rows as any[]).length === 0) {
      return null;
    }
    
    const user = (rows as any[])[0];
    
    if (user.locked) {
      return null;
    }
    
    // Convert JSON string to array
    user.passwordHistory = JSON.parse(user.passwordHistory);
    
    const { hash } = await hashPassword(password, user.salt);
    
    if (hash === user.passwordHash) {
      // Reset failed attempts on success
      await pool.execute(
        `UPDATE users SET failedLoginAttempts = 0 WHERE id = '${user.id}'`
      );
      return user as User;
    } else {
      // Increment failed attempts
      const newFailedAttempts = user.failedLoginAttempts + 1;
      const locked = newFailedAttempts >= 3;
      
      await pool.execute(
        `UPDATE users SET failedLoginAttempts = ${newFailedAttempts}, locked = ${locked} WHERE id = '${user.id}'`
      );
      return null;
    }
  } catch (error) {
    console.error('Failed to login:', error);
    return null;
  }
};

// Secure login
export const loginUser = async (username: string, password: string): Promise<User | null> => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username.trim()]
    );
    
    if ((rows as any[]).length === 0) {
      return null;
    }
    
    const user = (rows as any[])[0];
    
    if (user.locked) {
      return null;
    }
    
    // Convert JSON string to array
    user.passwordHistory = JSON.parse(user.passwordHistory);
    
    const { hash } = await hashPassword(password, user.salt);
    
    if (hash === user.passwordHash) {
      // Reset failed attempts on success
      await pool.execute(
        'UPDATE users SET failedLoginAttempts = 0 WHERE id = ?',
        [user.id]
      );
      return user as User;
    } else {
      // Increment failed attempts
      const newFailedAttempts = user.failedLoginAttempts + 1;
      const locked = newFailedAttempts >= 3;
      
      await pool.execute(
        'UPDATE users SET failedLoginAttempts = ?, locked = ? WHERE id = ?',
        [newFailedAttempts, locked, user.id]
      );
      return null;
    }
  } catch (error) {
    console.error('Failed to login:', error);
    return null;
  }
};

// Password reset functions
export const requestPasswordReset = async (email: string): Promise<{ success: boolean, token?: string }> => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if ((rows as any[]).length === 0) {
      return { success: false };
    }
    
    const user = (rows as any[])[0];
    const resetToken = await generateResetToken();
    const expiryTime = Date.now() + 3600000; // 1 hour
    
    await pool.execute(
      'UPDATE users SET lastResetToken = ?, lastResetTokenExpiry = ? WHERE id = ?',
      [resetToken, expiryTime, user.id]
    );
    
    // In a real app, you would send an email here
    // For this demo, we'll return the token directly
    return { success: true, token: resetToken };
  } catch (error) {
    console.error('Failed to request password reset:', error);
    return { success: false };
  }
};

export const verifyResetToken = async (token: string): Promise<boolean> => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE lastResetToken = ?',
      [token]
    );
    
    if ((rows as any[]).length === 0) {
      return false;
    }
    
    const user = (rows as any[])[0];
    
    if (!user.lastResetTokenExpiry || user.lastResetTokenExpiry < Date.now()) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to verify reset token:', error);
    return false;
  }
};

export const resetPassword = async (token: string, newPassword: string): Promise<boolean> => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE lastResetToken = ?',
      [token]
    );
    
    if ((rows as any[]).length === 0) {
      return false;
    }
    
    const user = (rows as any[])[0];
    
    if (!user.lastResetTokenExpiry || user.lastResetTokenExpiry < Date.now()) {
      return false;
    }
    
    // Convert JSON string to array
    user.passwordHistory = JSON.parse(user.passwordHistory);
    
    // Check password history
    const isInHistory = await Promise.all(user.passwordHistory.map(async (historyHash: string) => {
      const checkHash = (await hashPassword(newPassword, user.salt)).hash;
      return checkHash === historyHash;
    })).then(results => results.some(result => result));
    
    if (isInHistory) {
      return false;
    }
    
    const { hash, salt } = await hashPassword(newPassword);
    
    // Update password history
    const passwordHistory = [...user.passwordHistory, hash];
    if (passwordHistory.length > 3) {
      passwordHistory.shift();
    }
    
    await pool.execute(
      `UPDATE users SET 
       passwordHash = ?, 
       salt = ?, 
       lastResetToken = NULL, 
       lastResetTokenExpiry = NULL, 
       locked = 0, 
       failedLoginAttempts = 0, 
       passwordHistory = ?
       WHERE id = ?`,
      [hash, salt, JSON.stringify(passwordHistory), user.id]
    );
    
    return true;
  } catch (error) {
    console.error('Failed to reset password:', error);
    return false;
  }
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string): Promise<boolean> => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if ((rows as any[]).length === 0) {
      return false;
    }
    
    const user = (rows as any[])[0];
    
    // Convert JSON string to array
    user.passwordHistory = JSON.parse(user.passwordHistory);
    
    // Verify current password
    const currentHash = (await hashPassword(currentPassword, user.salt)).hash;
    if (currentHash !== user.passwordHash) {
      return false;
    }
    
    // Check password history
    const isInHistory = await Promise.all(user.passwordHistory.map(async (historyHash: string) => {
      const checkHash = (await hashPassword(newPassword, user.salt)).hash;
      return checkHash === historyHash;
    })).then(results => results.some(result => result));
    
    if (isInHistory) {
      return false;
    }
    
    // Set new password
    const { hash, salt } = await hashPassword(newPassword);
    
    // Update password history
    const passwordHistory = [...user.passwordHistory, hash];
    if (passwordHistory.length > 3) {
      passwordHistory.shift();
    }
    
    await pool.execute(
      `UPDATE users SET 
       passwordHash = ?, 
       salt = ?, 
       passwordHistory = ?
       WHERE id = ?`,
      [hash, salt, JSON.stringify(passwordHistory), userId]
    );
    
    return true;
  } catch (error) {
    console.error('Failed to change password:', error);
    return false;
  }
};

// Customer Services (Vulnerable Version)
export const createCustomerVulnerable = async (customerData: Omit<Customer, 'id'>): Promise<Customer | null> => {
  try {
    const id = generateUUID();
    
    // Vulnerable to SQL injection
    await pool.execute(
      `INSERT INTO customers (id, name, email, phone, address, packageId, userId)
       VALUES ('${id}', '${customerData.name}', '${customerData.email}', '${customerData.phone}', '${customerData.address}', '${customerData.packageId}', '${customerData.userId}')`
    );
    
    return {
      ...customerData,
      id
    };
  } catch (error) {
    console.error('Failed to create customer:', error);
    return null;
  }
};

// Customer Services (Secure Version)
export const createCustomer = async (customerData: Omit<Customer, 'id'>): Promise<Customer | null> => {
  try {
    const id = generateUUID();
    
    // Sanitize inputs to prevent XSS
    const sanitizedData = {
      name: customerData.name.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      email: customerData.email.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      phone: customerData.phone.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      address: customerData.address.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      packageId: customerData.packageId,
      userId: customerData.userId
    };
    
    await pool.execute(
      `INSERT INTO customers (id, name, email, phone, address, packageId, userId)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, sanitizedData.name, sanitizedData.email, sanitizedData.phone, sanitizedData.address, sanitizedData.packageId, sanitizedData.userId]
    );
    
    return {
      ...sanitizedData,
      id
    };
  } catch (error) {
    console.error('Failed to create customer:', error);
    return null;
  }
};

export const getCustomersByUserId = async (userId: string): Promise<Customer[]> => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM customers WHERE userId = ?',
      [userId]
    );
    
    return rows as Customer[];
  } catch (error) {
    console.error('Failed to get customers:', error);
    return [];
  }
};

export const getPackages = async (): Promise<Package[]> => {
  try {
    const [rows] = await pool.execute('SELECT * FROM packages');
    
    // Convert JSON strings to arrays for features
    return (rows as any[]).map(pkg => ({
      ...pkg,
      features: JSON.parse(pkg.features)
    }));
  } catch (error) {
    console.error('Failed to get packages:', error);
    return [];
  }
};

export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if ((rows as any[]).length === 0) {
      return null;
    }
    
    const user = (rows as any[])[0];
    
    // Convert JSON string to array
    user.passwordHistory = JSON.parse(user.passwordHistory);
    
    return user as User;
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
};
