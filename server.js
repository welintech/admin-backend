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
app.use(morgan('dev'));

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
require('./config/passport')(passport);

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Add admin routes
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Add member routes
const memberRoutes = require('./routes/member');
app.use('/api/member', memberRoutes);

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
