const fetch = require('node-fetch');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'test',
  description: 'Generate temporary email and check inbox (no token)',
  usage: '-tempmail gen OR -tempmail inbox <full email>',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const [cmd, emailInput] = args;

    if (!cmd) {
      return sendMessage(senderId, { text: 'Usage: -tempmail gen OR -tempmail inbox <full email>' }, pageAccessToken);
    }

    if (cmd === 'gen') {
      // Generate a random inbox name
      const name = Math.random().toString(36).substring(2, 10);
      const address = `${name}@maildrop.cc`;
      return sendMessage(senderId, { text: `📧 | Temporary Email: ${address}\nUse "-tempmail inbox ${address}" to check.` }, pageAccessToken);
    }

    if (cmd === 'inbox' && emailInput) {
      // Validate full email format
      if (!emailInput.includes('@')) {
        return sendMessage(senderId, { text: 'Error: Please provide a full email address (example@maildrop.cc)' }, pageAccessToken);
      }

      // Extract inbox name from full email
      const inboxName = emailInput.split('@')[0];

      try {
        const resp = await fetch('https://api.maildrop.cc/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query($name: String!) {
                inbox(name: $name) {
                  messages {
                    id
                    from
                    subject
                    date
                    text
                  }
                }
              }`,
            variables: { name: inboxName }
          })
        });

        const { data } = await resp.json();
        const messages = data?.inbox?.messages;

        if (!messages || messages.length === 0) {
          return sendMessage(senderId, { text: '📭 | Inbox is empty or doesn’t exist.' }, pageAccessToken);
        }

        const latest = messages[0];
        await sendMessage(senderId, {
          text: `📬 From: ${latest.from}\nDate: ${new Date(latest.date).toLocaleString()}\nSubject: ${latest.subject}`
        }, pageAccessToken);

        const content = latest.text || '';
        for (let chunkStart = 0; chunkStart < content.length; chunkStart += 1900) {
          await sendMessage(
            senderId,
            { text: content.substr(chunkStart, 1900) },
            pageAccessToken
          );
        }
      } catch (err) {
        console.error(err);
        return sendMessage(senderId, { text: 'Error: Could not fetch inbox.' }, pageAccessToken);
      }
    } else {
      return sendMessage(senderId, { text: 'Usage: -tempmail gen OR -tempmail inbox <full email>' }, pageAccessToken);
    }
  },
};