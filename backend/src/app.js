require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const workshopsRoutes = require('./modules/workshops/workshops.routes');
const publicRoutes = require('./modules/public/public.routes');
const importRoutes = require('./modules/import/import.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// In production, set CORS_ALLOWED_ORIGINS to a comma-separated list (e.g. https://app.imc.org.il).
// Falls back to allowing any origin only when unset, which is fine for local dev but should
// always be set explicitly in staging/production.
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : null;

app.use(
  cors({
    origin: allowedOrigins || true,
  })
);
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/workshops', workshopsRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/import', importRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

module.exports = app;
