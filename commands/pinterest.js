const axios = require('axios');

module.exports = {
  name: 'pinterest',
  description: 'Fetch Pinterest images by keyword.',
  usage: 'pinterest <search> [count]',
  author: 'Coffee',

  async execute(ctx) {
    const match = ctx.body.match(/pinterest\s+(.+?)(?:\s*-?\s*(\d+))?$/i);
    if (!match) return ctx.reply('Please provide a valid search term.');

    const searchQuery = match[1].trim();
    let count = match[2] ? parseInt(match[2], 10) : 5;
    count = Math.max(1, Math.min(count, 20));

    try {
      const res = await axios.get(`https://orc-six.vercel.app/pinterest?search=${encodeURIComponent(searchQuery)}`);
      const data = res.data;
      const images = Array.isArray(data?.data) ? [...new Set(data.data)] : [];

      if (!images.length) return ctx.reply('No results found.');

      for (const url of images.slice(0, count)) {
        await ctx.sendImage(url);
      }
    } catch (err) {
      console.error('[Pinterest Error]', err.message);
      ctx.reply('Something went wrong while fetching Pinterest images.');
    }
  }
};