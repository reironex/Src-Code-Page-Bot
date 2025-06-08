const fetch = require('node-fetch');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'tempmail',
  description: 'Generate temporary email and check inbox (tempmail.plus API)',
  usage: '-tempmail gen OR -tempmail inbox <email>',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const [cmd, emailArg] = args;
    const usageMsg = { text: 'Usage: -tempmail gen OR -tempmail inbox <email>' };

    if (cmd === 'gen') {
      try {
        const resp = await fetch('https://api.tempmail.plus/domains');
        const data = await resp.json();
        const domains = data?.domains;

        if (!domains?.length) return sendMessage(senderId, { text: '❌ Error: Could not fetch domain list.' }, pageAccessToken);

        const name = Math.random().toString(36).slice(2, 10);
        const domain = domains[Math.floor(Math.random() * domains.length)];

        return sendMessage(senderId, {
          text: `📧 | Temporary Email: ${name}@${domain}\nUse "-tempmail inbox ${name}@${domain}" to check.`
        }, pageAccessToken);

      } catch (err) {
        console.error(err);
        return sendMessage(senderId, { text: '❌ Error: Could not generate email.' }, pageAccessToken);
      }
    }

    if (cmd === 'inbox' && emailArg) {
      try {
        const emailEncoded = encodeURIComponent(emailArg);
        const inboxResp = await fetch(`https://api.tempmail.plus/api/v1/mailbox/${emailEncoded}?limit=10`);
        const inboxData = await inboxResp.json();

        const messages = inboxData?.mail_list;
        if (!messages?.length)
          return sendMessage(senderId, { text: '📭 | Inbox is empty or doesn’t exist.' }, pageAccessToken);

        const latest = messages[0];
        await sendMessage(senderId, {
          text: `📬 From: ${latest.from}\nDate: ${latest.date}\nSubject: ${latest.subject}\nMessage ID: ${latest.id}`
        }, pageAccessToken);

        const msgResp = await fetch(`https://api.tempmail.plus/api/v1/message/${latest.id}`);
        const msgData = await msgResp.json();

        const content = msgData?.text || msgData?.html || 'No content.';
        for (let i = 0; i < content.length; i += 1900)
          await sendMessage(senderId, { text: content.slice(i, i + 1900) }, pageAccessToken);

      } catch (err) {
        console.error(err);
        return sendMessage(senderId, { text: '❌ Error: Could not fetch inbox.' }, pageAccessToken);
      }
    }

    return sendMessage(senderId, usageMsg, pageAccessToken);
  },
};