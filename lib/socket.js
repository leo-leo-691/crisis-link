// Socket.IO singleton — allows API routes to emit events
// without circular imports from server.js

let _io = null;
const IO_KEY = '__CRISISLINK_SOCKET_IO__';

function setIO(instance) {
  _io = instance;
  if (typeof globalThis !== 'undefined') {
    globalThis[IO_KEY] = instance;
  }
}

function getIO() {
  if (_io) return _io;
  if (typeof globalThis !== 'undefined' && globalThis[IO_KEY]) {
    _io = globalThis[IO_KEY];
    return _io;
  }
  return null;
}

module.exports = {
  setIO,
  getIO,
};
