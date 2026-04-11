const { SecurityAudit } = require('./securityAudit.model');

async function emitAuthEvent(eventType, { userId = null, actorType = 'system', requestIp = null, outcome = 'success', metadata = {} } = {}) {
  return SecurityAudit.create({
    userId,
    eventType,
    metadata: {
      actorType,
      requestIp,
      outcome,
      ...metadata,
    },
  });
}

module.exports = {
  emitAuthEvent,
};
