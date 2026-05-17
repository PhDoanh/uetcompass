'use strict';

const connections = new Map();

function getUserConnections(userId) {
  const key = String(userId);
  if (!connections.has(key)) {
    connections.set(key, new Set());
  }
  return connections.get(key);
}

function addClient(userId, res) {
  const key = String(userId);
  const userConnections = getUserConnections(key);
  userConnections.add(res);

  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\\n\\n');
    } catch (_) {
      clearInterval(heartbeat);
      removeClient(key, res);
    }
  }, 15000);

  res.on('close', () => {
    clearInterval(heartbeat);
    removeClient(key, res);
  });
}

function removeClient(userId, res) {
  const key = String(userId);
  const userConnections = connections.get(key);
  if (!userConnections) {
    return;
  }

  userConnections.delete(res);
  if (userConnections.size === 0) {
    connections.delete(key);
  }
}

function notifyUser(userId, payload, eventName = 'progress:updated') {
  const key = String(userId);
  const userConnections = connections.get(key);
  if (!userConnections || userConnections.size === 0) {
    return false;
  }

  const dataLine = `data: ${JSON.stringify(payload)}\\n\\n`;
  for (const res of userConnections) {
    try {
      res.write(`event: ${eventName}\\n`);
      res.write(dataLine);
    } catch (_) {
      removeClient(key, res);
    }
  }

  return true;
}

module.exports = {
  addClient,
  removeClient,
  notifyUser,
  connections,
};
