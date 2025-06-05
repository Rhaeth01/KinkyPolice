const { logDeletedMessage } = require('../messageLogs');

module.exports = {
  name: 'messageDelete',
  async execute(message) {
    if (message.partial) await message.fetch();
    
    await logDeletedMessage(message);
  },
};