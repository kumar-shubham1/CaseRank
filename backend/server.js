require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const caseRoutes = require('./routes/caseRoutes');

const app = express();

const preferredPort = parseInt(process.env.PORT || '3000', 10);
const MAX_PORT_TRIES = 25;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API Routes
app.use('/api/cases', caseRoutes);

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

const server = http.createServer(app);
let port = preferredPort;
let tries = 0;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && tries < MAX_PORT_TRIES) {
    tries += 1;
    console.warn(`⚠️  Port ${port} is in use, trying ${port + 1}...`);
    port += 1;
    server.listen(port);
  } else {
    console.error(err);
    process.exit(1);
  }
});

server.listen(port, () => {
  console.log(`\n🚀 CaseRank server running at http://localhost:${port}`);
  console.log(`📊 Dashboard: http://localhost:${port}\n`);
  if (port !== preferredPort) {
    console.log(
      `💡 Using port ${port} (not ${preferredPort}). If you use Live Server, add to frontend/index.html <head>:\n` +
        `   <meta name="casrank-api-origin" content="http://127.0.0.1:${port}">\n`
    );
  }
});
