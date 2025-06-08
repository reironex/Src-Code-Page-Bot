const fetch = require('node-fetch');
const { sendMessage } = require('../handles/sendMessage');

const BASE_URL = 'https://tempr.email/api/v1';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
};

module.exports = {
  name: 'tempmail',
  description: 'Generate temporary email and check inbox (tempr.email public API)',
  usage: '-tempmail gen OR -tempmail inbox <mailboxId> OR -tempmail read <messageId>',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const [cmd, param1] = args;
    const usageMsg = { text: 'Usage: -tempmail gen OR -tempmail inbox <mailboxId> OR -tempmail read <messageId>' };

    if (cmd === 'gen') {
      try {
        const resp = await fetch(`${BASE_URL}/mailbox`, { headers: HEADERS });
        const data = await resp.json();

        if (!data?.mailbox?.email || !data?.mailbox?.id) {
          throw new Error('Invalid API response');
        }

        const mailboxId = data.mailbox.id;
        const address = data.mailbox.email;

        return sendMessage(senderId, {
          text: `📧 | Temporary Email: ${address}\nMailbox ID: ${mailboxId}\n\nUse "-tempmail inbox ${mailboxId}" to check inbox.`
        }, pageAccessToken);
      } catch (err) {
        console.error(err);
        return sendMessage(senderId, { text: '❌ Error: Could not generate email.' }, pageAccessToken);
      }
    }

    if (cmd === 'inbox' && param1) {
      const mailboxId = param1;
      try {
        const resp = await fetch(`${BASE_URL}/mailbox/${mailboxId}/messages`, { headers: HEADERS });
        const data = await resp.json();

        const messages = data?.messages || [];

        if (!messages.length) {
          return sendMessage(senderId, { text: '📭 | Inbox is empty.' }, pageAccessToken);
        }

        let out = '📬 | Latest messages:\n';
        messages.forEach(msg => {
          out += `\nID: ${msg.id}\nFrom: ${msg.from}\nSubject: ${msg.subject}\nDate: ${msg.createdAt}\n`;
        });

        await sendMessage(senderId, { text: out }, pageAccessToken);
      } catch (err) {
        console.error(err);
        return sendMessage(senderId, { text: '❌ Error: Could not fetch inbox.' }, pageAccessToken);
      }
    }

    if (cmd === 'read' && param1) {
      const messageId = param1;
      try {
        const resp = await fetch(`${BASE_URL}/message/${messageId}`, { headers: HEADERS });
        const msgData = await resp.json();

        const content = msgData?.text || msgData?.html || 'No content.';
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