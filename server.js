require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const mongoose = require('mongoose');
const cors = require('cors'); // Add CORS package

// Routes
const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/member');
const vendorRoutes = require('./routes/vendor');

// Initialize the app
const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173', // Vite dev server
    'http://localhost:3000', // React dev server
    'https://welin-dashboard-backend-493mx.ondigitalocean.app', // Your production domain
    // Add other allowed origins as needed
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
// Middleware
app.use(bodyParser.json());
app.use(passport.initialize());

// MongoDB connection from environment variable
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI, {
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
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);  // Exit the process if database connection fails
  });

// Passport config
require('./config/passport')(passport);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/vendors', vendorRoutes);
