const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const documentRoutes = require('./routes/document.routes');
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();
app.use(cors());
app.use(express.json());

//Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

//Error Handling Middleware
app.use(errorMiddleware);

module.exports = app;