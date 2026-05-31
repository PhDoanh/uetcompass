const connections = new Map();

function addConnection(userId, res) {
  const key = String(userId);

  if (connections.has(key)) {
    try {
      connections.get(key).end();
    } catch {
      // best effort cleanup
    }
  }

  connections.set(key, res);

  const heartbeat = setInterval(() => {
    try {
      res.write(':heartbeat\\n\\n');
    } catch {
      clearInterval(heartbeat);
      connections.delete(key);
    }
  }, 15000);

  res.on('close', () => {
    clearInterval(heartbeat);
    connections.delete(key);
  });
}

function pushNotification(userId, payload) {
  const key = String(userId);
  const connection = connections.get(key);

  if (!connection) {
    return false;
  }

  connection.write('event: notification\\n');
  connection.write(`data: ${JSON.stringify(payload)}\\n\\n`);
  return true;
}

function closeConnection(userId) {
  const key = String(userId);
  const connection = connections.get(key);

  if (connection) {
    connection.end();
    connections.delete(key);
  }
}

module.exports = {
  addConnection,
  closeConnection,
  connections,
  pushNotification,
};