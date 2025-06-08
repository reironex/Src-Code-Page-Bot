const { TempMail } = require('tempmail.lol');
const { sendMessage } = require('../handles/sendMessage');

// Simple in-memory cache: email => token
const tokenCache = {};

module.exports = {
  name: 'tempmail',
  description: 'Generate temporary email and check inbox',
  usage: '-tempmail gen OR -tempmail inbox <email>',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const tempmail = new TempMail(); // Create a TempMail instance
    const [cmd, emailArg] = args;

    // Validate input arguments before proceeding
    if (!cmd) {
      return sendMessage(senderId, { text: 'Invalid usage. You need to provide a command like -tempmail gen or -tempmail inbox <email>' }, pageAccessToken);
    }

    if (cmd === 'gen') {
      try {
        const inbox = await tempmail.createInbox();

        // Cache the token with email as key
        tokenCache[inbox.address] = inbox.token;

        return sendMessage(
          senderId,
          {
            text: `📧 | 𝐓𝐞𝐦𝐩𝐨𝐫𝐚𝐫𝐲 𝐄𝐦𝐚𝐢𝐥: ${inbox.address}\n\n🔎 To check the inbox later, use:\n-tempmail inbox ${inbox.address}`,
          },
          pageAccessToken
        );
      } catch (error) {
        return sendMessage(senderId, { text: 'Error: Unable to generate temporary email.' }, pageAccessToken);
      }
    }

    if (cmd === 'inbox') {
      if (!emailArg) {
        return sendMessage(senderId, { text: '❗ Please provide an email. Example: -tempmail inbox your-temporary-email@domain.com' }, pageAccessToken);
      }

      const tokenToUse = tokenCache[emailArg];

      if (!tokenToUse) {
        return sendMessage(senderId, { text: `❗ No cached token found for email: ${emailArg}\nPlease use -tempmail gen first to generate it.` }, pageAccessToken);
      }

      try {
        const emails = await tempmail.checkInbox(tokenToUse);

        if (!emails || emails.length === 0) {
          return sendMessage(senderId, { text: '📭 | Inbox is empty or has expired.' }, pageAccessToken);
        }

        const latestEmail = emails[0];

        // Send the metadata message (From, Date, Subject)
        await sendMessage(
          senderId,
          {
            text: `📬 | 𝐋𝐚𝐭𝐞𝐬𝐭 𝐄𝐦𝐚𝐢𝐥:\n𝐅𝐫𝐨𝐦: ${latestEmail.from}\n𝐃𝐚𝐭𝐞: ${new Date(latestEmail.date).toLocaleString()}\n𝐒𝐮𝐛𝐣𝐞𝐜𝐭: ${latestEmail.subject}`,
          },
          pageAccessToken
        );

        // Send the content in chunks
        const content = latestEmail.body;
        const chunkSize = 1900; // Maximum characters per message
        const chunks = [];

        // Split the content into chunks
        for (let i = 0; i < content.length; i += chunkSize) {
          chunks.push(content.slice(i, i + chunkSize));
        }

        // Send the first chunk with the "Content:" label
        await sendMessage(senderId, { text: `𝐂𝐨𝐧𝐭𝐞𝐧𝐭:\n${chunks[0]}` }, pageAccessToken);

        // Send subsequent chunks without the "Content:" label
        for (let i = 1; i < chunks.length; i++) {
          await sendMessage(senderId, { text: `${chunks[i]}` }, pageAccessToken);
        }

      } catch (error) {
        return sendMessage(senderId, { text: 'Error: Unable to fetch inbox or email content.' }, pageAccessToken);
      }
    } else {
      // Only send the invalid usage message if no valid command is provided
      return sendMessage(
        senderId,
        { text: 'Invalid usage. Use -tempmail gen or -tempmail inbox <email>' },
        pageAccessToken
      );
    }
  },
};