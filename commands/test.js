module.exports = {
  name: 'test',
  description: 'A test command.',
  usage: '-test',
  author: 'coffee',

  execute: async (senderId, args, pageAccessToken) => {
    // Your test logic goes here
    return sendMessage(senderId, { text: '✅ | Test command executed successfully.' }, pageAccessToken);
  }
};