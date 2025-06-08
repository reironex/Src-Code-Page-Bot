const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'tempmail',
  description: 'Generate temporary email and check inbox (moakt.com scraper)',
  usage: '-tempmail gen OR -tempmail inbox <username> OR -tempmail read <username> <msgId>',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const [cmd, param1, param2] = args;
    const usageMsg = { text: 'Usage: -tempmail gen OR -tempmail inbox <username> OR -tempmail read <username> <msgId>' };

    if (cmd === 'gen') {
      const username = Math.random().toString(36).substring(2, 10);
      const address = `${username}@moakt.cc`;

      return sendMessage(senderId, {
        text: `📧 | Temporary Email: ${address}\nUse "-tempmail inbox ${username}" to check inbox.`
      }, pageAccessToken);
    }

    if (cmd === 'inbox' && param1) {
      const username = param1;
      try {
        const resp = await fetch(`https://www.moakt.com/en/inbox/${username}`);
        const html = await resp.text();
        const $ = cheerio.load(html);

        const messages = [];

        $('table tbody tr').each((i, el) => {
          const cols = $(el).find('td');
          const msgId = $(cols[0]).find('a').attr('href')?.split('/').pop();
          const from = $(cols[1]).text().trim();
          const subject = $(cols[2]).text().trim();
          const date = $(cols[3]).text().trim();

          if (msgId) {
            messages.push({ msgId, from, subject, date });
          }
        });

        if (!messages.length) {
          return sendMessage(senderId, { text: '📭 | Inbox is empty.' }, pageAccessToken);
        }

        let out = '📬 | Latest messages:\n';
        messages.forEach(msg => {
          out += `\nID: ${msg.msgId}\nFrom: ${msg.from}\nSubject: ${msg.subject}\nDate: ${msg.date}\n`;
        });

        await sendMessage(senderId, { text: out }, pageAccessToken);
      } catch (err) {
        console.error(err);
        return sendMessage(senderId, { text: '❌ Error: Could not fetch inbox.' }, pageAccessToken);
      }
    }

    if (cmd === 'read' && param1 && param2) {
      const username = param1;
      const msgId = param2;
      try {
        const resp = await fetch(`https://www.moakt.com/en/message/${username}/${msgId}`);
        const html = await resp.text();
        const $ = cheerio.load(html);

        const content = $('#email_content').text().trim() || 'No content.';

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