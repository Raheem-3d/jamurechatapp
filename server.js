const { createServer } = require("http");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    // Set larger body size limit for upload endpoints
    if (req.url && req.url.startsWith('/api/upload')) {
      req.socket.setMaxListeners(20);
    }
    handle(req, res);
  });

  // Configure server with larger limits
  server.maxRequestSize = '5gb';
  server.maxHeaderSize = 16 * 1024 * 1024; // 16MB headers

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> JamureChat unified server running on port ${port} (env: ${process.env.NODE_ENV || 'development'})`);
    console.log("> Socket.io endpoint active via /api/socket and /api/socketio");
  });
});
