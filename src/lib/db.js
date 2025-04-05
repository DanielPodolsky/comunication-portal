import { pool } from './mysql.js';
import crypto from 'crypto';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Initialize the database
export const initDatabase = async () => {
  const { initializeDatabase } = await import('./mysql.js');
  await initializeDatabase();
};

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
export const hashPassword = async (password, salt) => {
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

// Browser localStorage implementations
const getUsers = () => {
  const usersStr = localStorage.getItem('users');
  return usersStr ? JSON.parse(usersStr) : [];
};

const saveUsers = (users) => {
  localStorage.setItem('users', JSON.stringify(users));
};

const getCustomers = () => {
  const customersStr = localStorage.getItem('customers');
  return customersStr ? JSON.parse(customersStr) : [];
};

const saveCustomers = (customers) => {
  localStorage.setItem('customers', JSON.stringify(customers));
};

const getPackages = () => {
  const packagesStr = localStorage.getItem('packages');
  return packagesStr ? JSON.parse(packagesStr) : [];
};

// Functions that work in both environments
export const createUser = async (username, email, password) => {
  if (isBrowser) {
    const users = getUsers();
  
    if (users.some(u => u.username === username || u.email === email)) {
      return null;
    }
    
    const { hash, salt } = await hashPassword(password);
    const id = generateUUID();
    
    const newUser = {
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
  }
  
  try {
    // Secure way with parameterized query
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username.trim(), email.trim()]
    );
    
    if (rows.length > 0) {
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

export const loginUser = async (username, password) => {
  if (isBrowser) {
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
  }
  
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username.trim()]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const user = rows[0];
    
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
      return user;
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

export const createCustomer = async (customerData) => {
  if (isBrowser) {
    const customers = getCustomers();
    const id = generateUUID();
    
    const newCustomer = {
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

export const getPackagesFromDB = async () => {
  if (isBrowser) {
    return getPackages();
  }
  
  try {
    const [rows] = await pool.execute('SELECT * FROM packages');
    
    // Convert JSON strings to arrays for features
    return rows.map(pkg => ({
      ...pkg,
      features: JSON.parse(pkg.features)
    }));
  } catch (error) {
    console.error('Failed to get packages:', error);
    return [];
  }
};

// Export the other functions from the original file...
export const loginUserVulnerable = loginUser;
export const createCustomerVulnerable = createCustomer;
export const requestPasswordReset = async () => {}; // add implementation if needed
export const verifyResetToken = async () => {}; // add implementation if needed
export const resetPassword = async () => {}; // add implementation if needed
export const changePassword = async () => {}; // add implementation if needed
export const getCustomersByUserId = async () => {}; // add implementation if needed
export const getUserById = async () => {}; // add implementation if needed

// Export the localStorage functions for browser preview
export { getPackages };
