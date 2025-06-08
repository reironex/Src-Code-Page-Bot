const fetch = require('node-fetch');
const { sendMessage } = require('../handles/sendMessage');

const sessions = new Map(); // Map senderId => session info

module.exports = {
  name: 'tempmail',
  description: 'Temporary email with Guerrilla Mail API',
  usage: '-tempmail gen OR -tempmail inbox OR -tempmail read <email_id>',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const [cmd, param] = args;

    // Generate email address & init session
    if (cmd === 'gen') {
      try {
        const res = await fetch('https://api.guerrillamail.com/ajax.php?f=get_email_address');
        const data = await res.json();

        if (!data.email_addr) {
          throw new Error('Could not generate email');
        }

        // Store session info per user
        sessions.set(senderId, { sidToken: data.sid_token, email: data.email_addr });

        return sendMessage(senderId, {
          text: `📧 GuerrillaMail Address: ${data.email_addr}\nUse "-tempmail inbox" to check messages.`,
        }, pageAccessToken);
      } catch (e) {
        console.error(e);
        return sendMessage(senderId, { text: '❌ Error generating GuerrillaMail email.' }, pageAccessToken);
      }
    }

    // Check inbox messages for session
    if (cmd === 'inbox') {
      const session = sessions.get(senderId);
      if (!session) {
        return sendMessage(senderId, { text: '⚠️ No GuerrillaMail session found. Generate email first with "-tempmail gen".' }, pageAccessToken);
      }

      try {
        const res = await fetch(`https://api.guerrillamail.com/ajax.php?f=get_email_list&offset=0&sid_token=${session.sidToken}`);
        const data = await res.json();

        if (!data.list || data.list.length === 0) {
          return sendMessage(senderId, { text: '📭 Inbox is empty.' }, pageAccessToken);
        }

        let text = '📬 GuerrillaMail Inbox:\n';
        data.list.forEach(msg => {
          text += `\nID: ${msg.mail_id}\nFrom: ${msg.mail_from}\nSubject: ${msg.mail_subject}\nDate: ${msg.mail_date}\n`;
        });

        return sendMessage(senderId, { text }, pageAccessToken);
      } catch (e) {
        console.error(e);
        return sendMessage(senderId, { text: '❌ Error fetching GuerrillaMail inbox.' }, pageAccessToken);
      }
    }

    // Read specific email by ID
    if (cmd === 'read' && param) {
      const session = sessions.get(senderId);
      if (!session) {
        return sendMessage(senderId, { text: '⚠️ No GuerrillaMail session found. Generate email first with "-tempmail gen".' }, pageAccessToken);
      }

      try {
        const res = await fetch(`https://api.guerrillamail.com/ajax.php?f=fetch_email&email_id=${param}&sid_token=${session.sidToken}`);
        const data = await res.json();

        if (!data.mail_body) {
          return sendMessage(senderId, { text: '❌ Message not found or empty.' }, pageAccessToken);
        }

        // Send subject + text body in chunks if needed
        const subject = data.mail_subject || 'No subject';
        const body = data.mail_body.replace(/<\/?[^>]+(>|$)/g, ""); // strip HTML tags

        await sendMessage(senderId, { text: `📧 Subject: ${subject}` }, pageAccessToken);

        for (let i = 0; i < body.length; i += 1900) {
          await sendMessage(senderId, { text: body.substring(i, i + 1900) }, pageAccessToken);
        }
      } catch (e) {
        console.error(e);
        return sendMessage(senderId, { text: '❌ Error reading GuerrillaMail message.' }, pageAccessToken);
      }
    }

    // Default usage message
    return sendMessage(senderId, {
      text: 'Usage:\n-tempmail gen\n-tempmail inbox\n-tempmail read <email_id>'
    }, pageAccessToken);
  }
};