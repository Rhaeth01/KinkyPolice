const { logEditedMessage } = require('../messageLogs');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage) {
    if (oldMessage.partial) await oldMessage.fetch();
    if (newMessage.partial) await newMessage.fetch();
    
    if (oldMessage.content === newMessage.content) return;
    
    await logEditedMessage(oldMessage, newMessage);
  },
};