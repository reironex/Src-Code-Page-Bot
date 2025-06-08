const tempmail = require('tempmail.lol').default();
const { sendMessage } = require('../handles/sendMessage');

const emailTokenCache = new Map();

module.exports = {
  name: 'tempmail',
  description: 'Generate temp email and check inbox (no API key needed)',
  usage: '-tempmail gen OR -tempmail inbox <email>',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const [cmd, emailArg] = args;

    if (!cmd) {
      return sendMessage(
        senderId,
        { text: 'Usage: -tempmail gen OR -tempmail inbox <email>' },
        pageAccessToken
      );
    }

    if (cmd === 'gen') {
      try {
        const inbox = await tempmail.createInbox();
        emailTokenCache.set(inbox.address, inbox.token);
        return sendMessage(
          senderId,
          {
            text: `📧 Temporary Email: ${inbox.address}\nUse "-tempmail inbox ${inbox.address}" to check messages.`,
          },
          pageAccessToken
        );
      } catch (e) {
        console.error(e);
        return sendMessage(senderId, { text: '❌ Error: Could not generate email.' }, pageAccessToken);
      }
    }

    if (cmd === 'inbox') {
      if (!emailArg) {
        return sendMessage(senderId, { text: 'Please provide the email to check.' }, pageAccessToken);
      }

      const token = emailTokenCache.get(emailArg);
      if (!token) {
        return sendMessage(senderId, {
          text: `❌ No token found for ${emailArg}. Please generate it first with "-tempmail gen".`,
        }, pageAccessToken);
      }

      try {
        const emails = await tempmail.checkInbox(token);
        if (!emails || emails.length === 0) {
          return sendMessage(senderId, { text: '📭 Inbox is empty or expired.' }, pageAccessToken);
        }

        const latest = emails[0];
        await sendMessage(senderId, {
          text: `📬 From: ${latest.from}\nSubject: ${latest.subject}\nDate: ${new Date(latest.date).toLocaleString()}`,
        }, pageAccessToken);

        if (latest.body) {
          // Split body in chunks of 1900 chars max
          for (let i = 0; i < latest.body.length; i += 1900) {
            await sendMessage(
              senderId,
              { text: latest.body.substring(i, i + 1900) },
              pageAccessToken
            );
          }
        }
      } catch (e) {
        console.error(e);
        return sendMessage(senderId, { text: '❌ Error: Could not fetch inbox.' }, pageAccessToken);
      }
    } else {
      return sendMessage(senderId, { text: 'Usage: -tempmail gen OR -tempmail inbox <email>' }, pageAccessToken);
    }
  },
};