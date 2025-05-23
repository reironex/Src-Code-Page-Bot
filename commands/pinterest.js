const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

function mix(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

module.exports = {
  name: 'pinterest',
  description: 'Search for Images in Pinterest.',
  usage: 'pinterest <search> [count]',
  author: 'Coffee',

  async execute(senderId, args, token) {
    const line = Buffer.from('aHR0cHM6Ly9vcmMtc2l4LnZlcmNlbC5hcHAvcGludGVyZXN0P3NlYXJjaD0=', 'base64').toString();

    const q = args.join(' ');
    const result = q.match(/^(.+?)[-\s]?(\d+)?$/i);
    if (!result) {
      return sendMessage(senderId, { text: 'Please provide a valid search term.' }, token);
    }

    const term = result[1].trim();
    let count = result[2] ? parseInt(result[2], 10) : 5;
    count = Math.min(Math.max(count, 1), 20);

    try {
      const pull = await axios.get(line + encodeURIComponent(term));
      const basket = Array.isArray(pull.data?.data) ? [...new Set(pull.data.data)] : [];

      if (!basket.length) {
        return sendMessage(senderId, { text: 'No results found.' }, token);
      }

      for (const item of mix(basket).slice(0, count)) {
        await sendMessage(senderId, { attachment: { type: 'image', payload: { url: item } } }, token);
      }
    } catch {
      sendMessage(senderId, { text: 'Error while retrieving images.' }, token);
    }
  }
};