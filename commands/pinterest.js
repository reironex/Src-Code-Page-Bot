const axios = require('axios');

module.exports = {
  name: 'pinterest',
  description: 'Fetch Pinterest images by keyword.',
  usage: 'pinterest <search> [count]',
  author: 'Coffee',
  
  async execute(ctx) {
    const args = ctx.args;
    if (!args.length) return ctx.reply('Please provide a search query.');

    let query = args.join(' ');
    const match = query.match(/(.+?)(?:\s*-?\s*(\d+))?$/i);

    let searchQuery = (match?.[1] || 'Pinterest').trim().toLowerCase();
    let imageCount = match?.[2] ? parseInt(match[2], 10) : 5;
    imageCount = Math.min(Math.max(imageCount, 1), 20);

    try {
      const { data } = await axios.get(`https://orc-six.vercel.app/pinterest?search=${encodeURIComponent(searchQuery)}`);
      if (!data?.data?.length) return ctx.reply('No images found.');

      const results = [...new Set(data.data)].slice(0, imageCount);
      for (const url of results) {
        await ctx.sendImage(url);
      }
    } catch (err) {
      console.error(err);
      ctx.reply('Failed to fetch Pinterest images.');
    }
  }
};