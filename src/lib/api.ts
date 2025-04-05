
// API utility functions for the frontend

// Base API URL - change if your server is running on a different port
const API_BASE_URL = 'http://localhost:3001/api';

// Helper function for making API requests
const apiRequest = async (endpoint: string, method: string = 'GET', data: any = null) => {
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'API request failed');
    }
    
    return result;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

// Get all packages
export const getPackages = async () => {
  return await apiRequest('/packages');
};

// Register a new user
export const registerUser = async (username: string, email: string, password: string) => {
  return await apiRequest('/register', 'POST', { username, email, password });
};

// Login user
export const loginUser = async (username: string, password: string) => {
  return await apiRequest('/login', 'POST', { username, password });
};

// Create new customer
export const createCustomer = async (customerData: {
  name: string;
  email: string;
  phone: string;
  address: string;
  packageId: string;
  userId: string;
}) => {
  return await apiRequest('/customers', 'POST', customerData);
};

// Get customers by user ID
export const getCustomersByUserId = async (userId: string) => {
  return await apiRequest(`/customers/${userId}`);
};

// Health check
export const checkApiHealth = async () => {
  return await apiRequest('/health');
};
