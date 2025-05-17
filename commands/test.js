const { sendMessage } = require('../handles/sendMessage');

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const API_KEY = 'fw_3ZZP4mu2QeZvFuN7NQA9UF5p';
const IMGBB_KEY = '596919061a4512babcb009c50c65fca1';

module.exports = {
  name: 'test',
  description: 'Generate an image and send the preview as a link.',
  usage: '-test [prompt]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    if (!args.length) {
      return sendMessage(senderId, { text: 'Please provide a prompt.' }, pageAccessToken);
    }

    const prompt = args.join(' ');

    try {
      // 1. Generate image from Fireworks
      const res = await fetch("https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/accounts/fireworks/models/flux-1-dev-fp8/text_to_image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "image/jpeg",
          "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({ prompt }),
      });

      const buffer = Buffer.from(await res.arrayBuffer());
      const base64Image = buffer.toString('base64'); // No data:image/jpeg prefix

      // 2. Upload to ImgBB
      const params = new URLSearchParams();
      params.append('key', IMGBB_KEY);
      params.append('image', base64Image);
      params.append('name', 'image');
      params.append('expiration', '600'); // Optional: 10 minutes

      const uploadRes = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });

      const uploadData = await uploadRes.json();

      if (!uploadData?.data?.url) {
        console.error('ImgBB error:', uploadData);
        return sendMessage(senderId, { text: '❎ | Failed to upload image.' }, pageAccessToken);
      }

      // 3. Send image URL to user
      await sendMessage(senderId, { text: uploadData.data.url }, pageAccessToken);
    } catch (err) {
      console.error('Image generation error:', err);
      await sendMessage(senderId, { text: '❎ | Error generating or sending the image.' }, pageAccessToken);
    }
  }
};