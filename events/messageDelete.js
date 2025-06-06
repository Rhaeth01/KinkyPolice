const { logDeletedMessage } = require('../utils/modernMessageLogs');

module.exports = {
  name: 'messageDelete',
  async execute(message) {
    if (message.partial) await message.fetch();
    
    await logDeletedMessage(message);
  },
};