const { AccountAuditEvent } = require('./account.model');
const { ACCOUNT_AUDIT_EVENTS } = require('./account.constants');

async function createEvent(userId, eventType, metadata = {}) {
  return AccountAuditEvent.create({ userId, eventType, metadata });
}

async function emitProfileUpdated(userId, metadata = {}) {
  return createEvent(userId, ACCOUNT_AUDIT_EVENTS.PROFILE_UPDATED, metadata);
}

async function emitPasswordChanged(userId, metadata = {}) {
  return createEvent(userId, ACCOUNT_AUDIT_EVENTS.PASSWORD_CHANGED, metadata);
}

module.exports = {
  createEvent,
  emitProfileUpdated,
  emitPasswordChanged,
};
