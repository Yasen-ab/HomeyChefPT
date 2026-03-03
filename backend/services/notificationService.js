const Notification = require('../models/Notification');
const { emitNotification } = require('../socket/notificationSocket');

async function createNotification(payload) {
  const notification = await Notification.create(payload);
  const serialized = notification.toJSON();
  emitNotification(serialized);
  return serialized;
}

module.exports = {
  createNotification
};
