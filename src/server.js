// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const mongoose = require('mongoose');
const cors = require('cors'); // Add CORS package
const morgan = require('morgan');

// Initialize the app
const app = express();

// Custom token for morgan
morgan.token('body', (req) => {
  return JSON.stringify(req.body);
});

morgan.token('query', (req) => {
  return JSON.stringify(req.query);
});

morgan.token('headers', (req) => {
  return JSON.stringify(req.headers);
});

// Enhanced logging configuration
app.use(
  morgan(
    ':method :url :status :response-time ms - :res[content-length] bytes\nHeaders: :headers\n'
  )
);

// CORS configuration
app.use(
  cors({
    origin: [
      'https://welin.in',
      'http://localhost:5174',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:8080',
      'https://welin-dashboard-backend-493mx.ondigitalocean.app',
      'https://welin-admin-frontend-e53kl.ondigitalocean.app',
      'https://admin-frontend-welin-bixa3.ondigitalocean.app',
      'https://welin-dashboard-mehrn.ondigitalocean.app',
      'https://portal.welin.in',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Add OPTIONS handling for preflight requests
app.options('*', cors());

// Middleware
app.use(bodyParser.json());
app.use(passport.initialize());

// Passport config
const configurePassport = require('./config/passport');
configurePassport(passport);

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Add admin routes
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Add member routes
const memberRoutes = require('./routes/member');
app.use('/api/member', memberRoutes);

// Add premium routes
const premiumRoutes = require('./routes/premiumRoutes');
app.use('/api/premium', premiumRoutes);

// Add loan cover routes
const loanCoverRoutes = require('./routes/loanCoverRoutes');
app.use('/api/loan-cover', loanCoverRoutes);

// Add payment routes
const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/payments', paymentRoutes);

// Global error handling middleware
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Initialize cleanup job
require('./jobs/cleanupPayments');

// MongoDB connection from environment variable
const mongoURI = process.env.MONGO_URI;

mongoose
  .connect(mongoURI, {
    // `useNewUrlParser` and `useUnifiedTopology` options are no longer needed as well, but they can still be used safely
  })
  .then(() => {
    console.log('Connected to MongoDB');

    // Start the server only after successful database connection
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1); // Exit the process if database connection fails
  });
