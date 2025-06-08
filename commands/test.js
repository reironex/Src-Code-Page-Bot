const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'tempmail',
  description: 'Generate temporary email and check inbox (maildrop.cc with Cheerio)',
  usage: '-tempmail gen OR -tempmail inbox <inboxName>',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const [cmd, inboxName] = args;
    const usageMsg = { text: 'Usage: -tempmail gen OR -tempmail inbox <inboxName>' };

    if (cmd === 'gen') {
      const name = Math.random().toString(36).substring(2, 10);
      const address = `${name}@maildrop.cc`;

      return sendMessage(senderId, {
        text: `📧 | Temporary Email: ${address}\nInbox link: https://maildrop.cc/inbox/${name}\nUse "-tempmail inbox ${name}" to check.`
      }, pageAccessToken);
    }

    if (cmd === 'inbox' && inboxName) {
      try {
        const inboxUrl = `https://maildrop.cc/inbox/${inboxName}`;
        const resp = await fetch(inboxUrl);
        const html = await resp.text();
        const $ = cheerio.load(html);

        const messages = [];
        $('table.table tbody tr').each((_, el) => {
          const subject = $(el).find('td:nth-child(2)').text().trim();
          const from = $(el).find('td:nth-child(3)').text().trim();
          const link = $(el).find('td:nth-child(2) a').attr('href');
          if (link) {
            messages.push({ subject, from, link: `https://maildrop.cc${link}` });
          }
        });

        if (!messages.length) {
          return sendMessage(senderId, { text: '📭 | Inbox is empty or does not exist.' }, pageAccessToken);
        }

        const latest = messages[0];
        await sendMessage(senderId, {
          text: `📬 From: ${latest.from}\nSubject: ${latest.subject}\nReading message...`
        }, pageAccessToken);

        // Fetch full message
        const msgResp = await fetch(latest.link);
        const msgHtml = await msgResp.text();
        const $$ = cheerio.load(msgHtml);
        const content = $$('#email_body').text().trim() || 'No content.';

        // Split into chunks if needed
        for (let i = 0; i < content.length; i += 1900) {
          await sendMessage(senderId, { text: content.slice(i, i + 1900) }, pageAccessToken);
        }

      } catch (err) {
        console.error(err);
        return sendMessage(senderId, { text: '❌ Error: Could not fetch inbox.' }, pageAccessToken);
      }
    }

    return sendMessage(senderId, usageMsg, pageAccessToken);
  },
};