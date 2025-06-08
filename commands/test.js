const fetch = require('node-fetch');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'tempmail',
  description: 'Generate temporary email and check inbox (no token)',
  usage: '-tempmail gen OR -tempmail inbox <inboxName>',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const [cmd, inboxName] = args;
    const usageMsg = { text: 'Usage: -tempmail gen OR -tempmail inbox <inboxName>' };

    if (cmd === 'gen') {
      const name = Math.random().toString(36).slice(2, 10);
      return sendMessage(senderId, {
        text: `📧 | Temporary Email: ${name}@maildrop.cc\nUse "-tempmail inbox ${name}" to check.`
      }, pageAccessToken);
    }

    if (cmd === 'inbox' && inboxName) {
      try {
        const resp = await fetch(`https://maildrop.cc/api/inbox/${inboxName}`);
        const data = await resp.json();
        const messages = data?.messages;
        
        if (!messages?.length)
          return sendMessage(senderId, { text: '📭 | Inbox is empty or doesn’t exist.' }, pageAccessToken);

        const { from, subject, time, id } = messages[0];
        await sendMessage(senderId, {
          text: `📬 From: ${from}\nTime: ${time}\nSubject: ${subject}\nMessage ID: ${id}`
        }, pageAccessToken);

      } catch (err) {
        console.error(err);
        return sendMessage(senderId, { text: '❌ Error: Could not fetch inbox.' }, pageAccessToken);
      }
    }

    return sendMessage(senderId, usageMsg, pageAccessToken);
  },
};