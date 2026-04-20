// Socket.IO singleton — allows API routes to emit events
// without circular imports from server.js

let _io = null;

module.exports = {
  setIO: (instance) => { _io = instance; },
  getIO: () => _io,
};
