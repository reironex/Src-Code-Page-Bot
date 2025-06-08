const fetch = require('node-fetch');
const { sendMessage } = require('../handles/sendMessage');

const BASE_URL = 'https://www.1secmail.cc/api/v1/';

module.exports = {
  name: 'tempmail',
  description: 'Generate temporary email and check inbox (1secmail.cc public API)',
  usage: '-tempmail gen OR -tempmail inbox <email> OR -tempmail read <email> <msgId>',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const [cmd, email, msgId] = args;
    const usageMsg = { text: 'Usage: -tempmail gen OR -tempmail inbox <email> OR -tempmail read <email> <msgId>' };

    if (cmd === 'gen') {
      try {
        const resp = await fetch(`${BASE_URL}?action=genRandomMailbox&count=1`);
        const emails = await resp.json();
        const address = emails[0];

        return sendMessage(senderId, {
          text: `📧 | Temporary Email: ${address}\nUse "-tempmail inbox ${address}" to check inbox.`
        }, pageAccessToken);
      } catch (err) {
        console.error(err);
        return sendMessage(senderId, { text: '❌ Error: Could not generate email.' }, pageAccessToken);
      }
    }

    if (cmd === 'inbox' && email) {
      try {
        const [login, domain] = email.split('@');
        if (!login || !domain) {
          return sendMessage(senderId, { text: '❌ Invalid email format.' }, pageAccessToken);
        }

        const resp = await fetch(`${BASE_URL}?action=getMessages&login=${login}&domain=${domain}`);
        const messages = await resp.json();

        if (!messages.length) {
          return sendMessage(senderId, { text: '📭 | Inbox is empty.' }, pageAccessToken);
        }

        let out = '📬 | Latest messages:\n';
        for (const msg of messages.slice(0, 5)) {
          out += `\nID: ${msg.id}\nFrom: ${msg.from}\nSubject: ${msg.subject}\nDate: ${msg.date}\n`;
        }

        await sendMessage(senderId, { text: out }, pageAccessToken);
      } catch (err) {
        console.error(err);
        return sendMessage(senderId, { text: '❌ Error: Could not fetch inbox.' }, pageAccessToken);
      }
    }

    if (cmd === 'read' && email && msgId) {
      try {
        const [login, domain] = email.split('@');
        if (!login || !domain) {
          return sendMessage(senderId, { text: '❌ Invalid email format.' }, pageAccessToken);
        }

        const msgResp = await fetch(`${BASE_URL}?action=readMessage&login=${login}&domain=${domain}&id=${msgId}`);
        const msgData = await msgResp.json();

        const content = msgData.textBody || msgData.htmlBody || 'No content.';
        for (let i = 0; i < content.length; i += 1900) {
          await sendMessage(senderId, { text: content.slice(i, i + 1900) }, pageAccessToken);
        }
      } catch (err) {
        console.error(err);
        return sendMessage(senderId, { text: '❌ Error: Could not read message.' }, pageAccessToken);
      }
    }

    return sendMessage(senderId, usageMsg, pageAccessToken);
  },
};