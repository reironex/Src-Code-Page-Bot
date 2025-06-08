const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'test',
  description: 'Send your senderId',
  usage: '-myid',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    await sendMessage(senderId, { text: `Your sender ID is: ${senderId}` }, pageAccessToken);
  }
};