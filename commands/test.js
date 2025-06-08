const TempMail = require('tempmail.lol').default;
const { sendMessage } = require('../handles/sendMessage');

const tempmail = new TempMail();
const sessions = new Map(); // email (lowercased) -> { token }

module.exports = {
  name: 'tempmail',
  description: 'Generate temporary email and check inbox using TempMail.lol',
  usage: '-tempmail gen OR -tempmail inbox <email>',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const [cmd, emailArg] = args;
    const usage = { text: 'Usage: -tempmail gen OR -tempmail inbox <email>' };

    // Generate inbox
    if (cmd === 'gen') {
      try {
        const inbox = await tempmail.createInbox();
        sessions.set(inbox.address.toLowerCase(), { token: inbox.token });

        await sendMessage(senderId, {
          text: `📧 Temporary Email: ${inbox.address}\nUse "-tempmail inbox ${inbox.address}" to check inbox.`
        }, pageAccessToken);
      } catch (e) {
        console.error(e);
        await sendMessage(senderId, { text: '❌ Error: Could not generate email.' }, pageAccessToken);
      }
      return;
    }

    // Check inbox
    if (cmd === 'inbox' && emailArg) {
      const email = emailArg.toLowerCase();
      const session = sessions.get(email);

      if (!session) {
        await sendMessage(senderId, { text: '⚠️ No token found for this email. Please generate it first with "-tempmail gen".' }, pageAccessToken);
        return;
      }

      try {
        const emails = await tempmail.checkInbox(session.token);

        if (!emails || emails.length === 0) {
          await sendMessage(senderId, { text: '📭 Inbox is empty.' }, pageAccessToken);
          return;
        }

        const latest = emails[0];
        await sendMessage(senderId, {
          text: `📬 From: ${latest.from}\nSubject: ${latest.subject}\nDate: ${new Date(latest.date).toLocaleString()}`
        }, pageAccessToken);

        const body = latest.body || '';
        for (let i = 0; i < body.length; i += 1900) {
          await sendMessage(senderId, { text: body.substring(i, i + 1900) }, pageAccessToken);
        }
      } catch (e) {
        console.error(e);
        await sendMessage(senderId, { text: '❌ Error: Could not fetch inbox.' }, pageAccessToken);
      }
      return;
    }

    // Default usage message
    await sendMessage(senderId, usage, pageAccessToken);
  }
};