require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
passport.use(require('./modules/auth/google.strategy'));
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const workshopsRoutes = require('./modules/workshops/workshops.routes');
const publicRoutes = require('./modules/public/public.routes');
const importRoutes = require('./modules/import/import.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : null;

app.use(cors({ origin: allowedOrigins || true }));
app.use(passport.initialize());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/workshops', workshopsRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/import', importRoutes);
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

module.exports = app;
