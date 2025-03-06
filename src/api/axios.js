import axios from 'axios';

// Create axios instance with base URL
const instance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to include auth token
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Log requests in development
if (process.env.NODE_ENV === 'development') {
  instance.interceptors.request.use(request => {
    console.log('API Request:', request.method, request.url);
    return request;
  });

  instance.interceptors.response.use(response => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  }, error => {
    console.error('API Error:', error.response?.status || error.message);
    return Promise.reject(error);
  });
}

export default instance; 