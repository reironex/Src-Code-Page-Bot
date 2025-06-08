const fetch = require('node-fetch');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'tempmail',
  description: 'Generate temporary email and check inbox (1secmail API, flexible domain)',
  usage: '-tempmail gen OR -tempmail inbox <login@domain>',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const [cmd, emailArg] = args;
    const usageMsg = { text: 'Usage: -tempmail gen OR -tempmail inbox <login@domain>' };

    if (cmd === 'gen') {
      try {
        const resp = await fetch('https://www.1secmail.com/api/v1/?action=getDomainList');
        const domains = await resp.json();

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
      const match = emailArg.match(/^([^@]+)@(.+)$/);
      if (!match) return sendMessage(senderId, usageMsg, pageAccessToken);

      const [_, login, domain] = match;

      try {
        const resp = await fetch(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`);
        const messages = await resp.json();

        if (!messages?.length)
          return sendMessage(senderId, { text: '📭 | Inbox is empty or doesn’t exist.' }, pageAccessToken);

        const latest = messages[0];
        await sendMessage(senderId, {
          text: `📬 From: ${latest.from}\nDate: ${latest.date}\nSubject: ${latest.subject}\nMessage ID: ${latest.id}`
        }, pageAccessToken);

        // Optional: fetch message body
        const msgResp = await fetch(`https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${latest.id}`);
        const msgData = await msgResp.json();

        const content = msgData.textBody || msgData.htmlBody || 'No content.';
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