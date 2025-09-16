#!/usr/bin/env node
/* server.js (entrypoint) */
const path = require('path');
const express = require('express');

const PORT = process.env.PORT || 3000;

const app = express();

// Servir les fichiers statiques (frontend minimal)
app.use(express.static(path.join(__dirname, 'public')));

// Routes API
const convertRouter = require('./routes/convert');
app.use('/convert', convertRouter);

app.listen(PORT, () => {
  console.log(`✅ bww2abc server prêt sur http://localhost:${PORT}`);
});

