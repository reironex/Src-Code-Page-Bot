const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'tempmail',
  description: 'Generate temporary email and check inbox (100% cheerio)',
  usage: '-tempmail gen OR -tempmail inbox <inboxName> OR -tempmail read <inboxName> <msgIndex>',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const [cmd, inboxName, msgIndex] = args;
    const usageMsg = { text: 'Usage: -tempmail gen OR -tempmail inbox <inboxName> OR -tempmail read <inboxName> <msgIndex>' };

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

        let out = '📬 | Latest messages:\n';
        messages.slice(0, 5).forEach((msg, i) => {
          out += `\n${i + 1}. ${msg.subject} — from ${msg.from}`;
        });

        await sendMessage(senderId, { text: out }, pageAccessToken);

      } catch (err) {
        console.error(err);
        return sendMessage(senderId, { text: '❌ Error: Could not fetch inbox.' }, pageAccessToken);
      }
    }

    if (cmd === 'read' && inboxName && msgIndex) {
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

        const index = parseInt(msgIndex, 10) - 1;
        if (isNaN(index) || index < 0 || index >= messages.length) {
          return sendMessage(senderId, { text: '❌ Invalid message index.' }, pageAccessToken);
        }

        const selected = messages[index];

        await sendMessage(senderId, {
          text: `📬 Reading message #${msgIndex}\nFrom: ${selected.from}\nSubject: ${selected.subject}`
        }, pageAccessToken);

        const msgResp = await fetch(selected.link);
        const msgHtml = await msgResp.text();
        const $$ = cheerio.load(msgHtml);
        const content = $$('#email_body').text().trim() || 'No content.';

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