import { pool } from './mysql';
import crypto from 'crypto';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Initialize the database
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
  if (isBrowser) {
    // Use Web Crypto API for browser
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Use Node.js crypto for server
    return crypto.randomBytes(length).toString('hex');
  }
};

// Generate UUID
const generateUUID = () => {
  if (isBrowser) {
    // Use browser's built-in UUID generation
    return crypto.randomUUID();
  } else {
    // Use Node.js crypto
    return crypto.randomUUID();
  }
};

// Hash password (works in both browser and Node.js)
export const hashPassword = async (password: string, salt?: string): Promise<{ hash: string, salt: string }> => {
  const generatedSalt = salt || generateRandomString(16);
  
  if (isBrowser) {
    // Use Web Crypto API for browser
    const encoder = new TextEncoder();
    const data = encoder.encode(password + generatedSalt);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return { hash: hashHex, salt: generatedSalt };
  } else {
    // Use Node.js crypto
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, generatedSalt, 1000, 64, 'sha512', (err, derivedKey) => {
        if (err) reject(err);
        resolve({
          hash: derivedKey.toString('hex'),
          salt: generatedSalt
        });
      });
    });
  }
};

// Generate token for password reset
export const generateResetToken = async (): Promise<string> => {
  return generateRandomString(20);
};

// Browser localStorage implementations
const getUsers = (): User[] => {
  const usersStr = localStorage.getItem('users');
  return usersStr ? JSON.parse(usersStr) : [];
};

const saveUsers = (users: User[]) => {
  localStorage.setItem('users', JSON.stringify(users));
};

const getCustomers = (): Customer[] => {
  const customersStr = localStorage.getItem('customers');
  return customersStr ? JSON.parse(customersStr) : [];
};

const saveCustomers = (customers: Customer[]) => {
  localStorage.setItem('customers', JSON.stringify(customers));
};

const getPackages = (): Package[] => {
  const packagesStr = localStorage.getItem('packages');
  return packagesStr ? JSON.parse(packagesStr) : [];
};

// User Services (Browser implementation)
const createUserBrowser = async (username: string, email: string, password: string): Promise<User | null> => {
  const users = getUsers();
  
  if (users.some(u => u.username === username || u.email === email)) {
    return null;
  }
  
  const { hash, salt } = await hashPassword(password);
  const id = generateUUID();
  
  const newUser: User = {
    id,
    username: username.trim(),
    email: email.trim(),
    passwordHash: hash,
    salt,
    passwordHistory: [hash],
    failedLoginAttempts: 0,
    locked: false
  };
  
  users.push(newUser);
  saveUsers(users);
  
  return newUser;
};

const loginUserBrowser = async (username: string, password: string): Promise<User | null> => {
  const users = getUsers();
  const user = users.find(u => u.username === username);
  
  if (!user || user.locked) {
    return null;
  }
  
  const { hash } = await hashPassword(password, user.salt);
  
  if (hash === user.passwordHash) {
    // Reset failed attempts on success
    user.failedLoginAttempts = 0;
    saveUsers(users);
    return user;
  } else {
    // Increment failed attempts
    user.failedLoginAttempts += 1;
    user.locked = user.failedLoginAttempts >= 3;
    saveUsers(users);
    return null;
  }
};

// Functions that work in both environments
export const createUser = async (username: string, email: string, password: string): Promise<User | null> => {
  if (isBrowser) {
    return createUserBrowser(username, email, password);
  }
  
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

export const createUserVulnerable = createUser; // For demo, just use the secure version

export const loginUser = async (username: string, password: string): Promise<User | null> => {
  if (isBrowser) {
    return loginUserBrowser(username, password);
  }
  
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

export const loginUserVulnerable = loginUser; // For demo, just use the secure version

// Password reset functions
export const requestPasswordReset = async (email: string): Promise<{ success: boolean, token?: string }> => {
  if (isBrowser) {
    const users = getUsers();
    const user = users.find(u => u.email === email);
    
    if (!user) {
      return { success: false };
    }
    
    const resetToken = await generateResetToken();
    const expiryTime = Date.now() + 3600000; // 1 hour
    
    user.lastResetToken = resetToken;
    user.lastResetTokenExpiry = expiryTime;
    saveUsers(users);
    
    return { success: true, token: resetToken };
  }
  
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
  if (isBrowser) {
    const users = getUsers();
    const user = users.find(u => u.lastResetToken === token);
    
    if (!user) {
      return false;
    }
    
    if (!user.lastResetTokenExpiry || user.lastResetTokenExpiry < Date.now()) {
      return false;
    }
    
    return true;
  }
  
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
  if (isBrowser) {
    const users = getUsers();
    const user = users.find(u => u.lastResetToken === token);
    
    if (!user) {
      return false;
    }
    
    if (!user.lastResetTokenExpiry || user.lastResetTokenExpiry < Date.now()) {
      return false;
    }
    
    const { hash } = await hashPassword(newPassword, user.salt);
    
    // Check password history
    if (user.passwordHistory.includes(hash)) {
      return false;
    }
    
    user.passwordHistory.push(hash);
    if (user.passwordHistory.length > 3) {
      user.passwordHistory.shift();
    }
    
    user.passwordHash = hash;
    user.lastResetToken = null;
    user.lastResetTokenExpiry = null;
    user.failedLoginAttempts = 0;
    user.locked = false;
    
    saveUsers(users);
    return true;
  }
  
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
  if (isBrowser) {
    const users = getUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return false;
    }
    
    const { hash: currentHash } = await hashPassword(currentPassword, user.salt);
    if (currentHash !== user.passwordHash) {
      return false;
    }
    
    const { hash } = await hashPassword(newPassword, user.salt);
    
    // Check password history
    if (user.passwordHistory.includes(hash)) {
      return false;
    }
    
    user.passwordHistory.push(hash);
    if (user.passwordHistory.length > 3) {
      user.passwordHistory.shift();
    }
    
    user.passwordHash = hash;
    saveUsers(users);
    return true;
  }
  
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

// Customer Services
export const createCustomer = async (customerData: Omit<Customer, 'id'>): Promise<Customer | null> => {
  if (isBrowser) {
    const customers = getCustomers();
    const id = generateUUID();
    
    const newCustomer: Customer = {
      id,
      ...customerData,
      name: customerData.name.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      email: customerData.email.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      phone: customerData.phone.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      address: customerData.address.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    };
    
    customers.push(newCustomer);
    saveCustomers(customers);
    
    return newCustomer;
  }
  
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

export const createCustomerVulnerable = createCustomer; // For demo, just use the secure version

export const getCustomersByUserId = async (userId: string): Promise<Customer[]> => {
  if (isBrowser) {
    const customers = getCustomers();
    return customers.filter(c => c.userId === userId);
  }
  
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

export const getPackagesFromDB = async (): Promise<Package[]> => {
  if (isBrowser) {
    return getPackages();
  }
  
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
  if (isBrowser) {
    const users = getUsers();
    return users.find(u => u.id === userId) || null;
  }
  
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

// Export the localStorage functions for browser preview
export { getPackages };
