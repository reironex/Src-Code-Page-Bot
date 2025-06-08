const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'pageid',
  description: 'Send the bot’s Page ID',
  usage: '-pageid',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    try {
      const response = await fetch(`https://graph.facebook.com/v22.0/me?access_token=${pageAccessToken}`);
      const data = await response.json();

      if (data.id) {
        await sendMessage(senderId, { text: `The bot's Page ID is: ${data.id}` }, pageAccessToken);
      } else {
        await sendMessage(senderId, { text: `Failed to retrieve Page ID.` }, pageAccessToken);
      }
    } catch (error) {
      console.error('Error fetching Page ID:', error);
      await sendMessage(senderId, { text: 'An error occurred while retrieving the Page ID.' }, pageAccessToken);
    }
  }
};