const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const GEMINI_API_KEY = 'AIzaSyAowq5pmdXV8GZ4xJrGKSgjsQQ3Ds48Dlg';
const conversations = new Map();

const getImageUrl = async (event, token) => {
  const mid = event?.message?.reply_to?.mid || event?.message?.mid;
  if (!mid) return null;

  try {
    const { data } = await axios.get(`https://graph.facebook.com/v22.0/${mid}/attachments`, {
      params: { access_token: token }
    });

    return data?.data?.[0]?.image_data?.url || data?.data?.[0]?.file_url || null;
  } catch (err) {
    console.error("Image URL fetch error:", err?.response?.data || err.message);
    return null;
  }
};

module.exports = {
  name: 'ai',
  description: 'Interact with Google Gemini.',
  usage: 'ai [question]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken, event, sendMessage, imageCache) {
    const prompt = args.join(' ').trim();
    if (!prompt) {
      return sendMessage(senderId, { text: "Ask me something!" }, pageAccessToken);
    }

    // 1. Try reply-to image first
    let imageUrl = await getImageUrl(event, pageAccessToken);

    // 2. If not found, fallback to imageCache
    if (!imageUrl && imageCache) {
      const cached = imageCache.get(senderId);
      if (cached && Date.now() - cached.timestamp <= 5 * 60 * 1000) {
        imageUrl = cached.url;
        console.log(`Using cached image for sender ${senderId}: ${imageUrl}`);
      }
    }

    let imagePart = null;

    // 3. Convert image to base64
    if (imageUrl) {
      try {
        const imgResp = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const base64 = Buffer.from(imgResp.data, 'binary').toString('base64');
        const mimeType = imgResp.headers['content-type'];
        imagePart = {
          inline_data: {
            mimeType,
            data: base64
          }
        };
      } catch (err) {
        console.error("Image download error:", err.message);
        return sendMessage(senderId, { text: "❎ | Failed to process the image." }, pageAccessToken);
      }
    }

    // 4. Build Gemini prompt
    const history = conversations.get(senderId) || [];
    const userParts = imagePart ? [{ text: prompt }, imagePart] : [{ text: prompt }];
    history.push({ role: "user", parts: userParts });

    const payload = {
      contents: history,
      generationConfig: { responseMimeType: "text/plain" }
    };

    // 5. Call Gemini API
    try {
      const { data } = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );

      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (reply) {
        history.push({ role: "model", parts: [{ text: reply }] });
        conversations.set(senderId, history.slice(-20));
      }

      const message = reply
        ? `💬 | 𝙶𝚘𝚘𝚐𝚕𝚎 𝙶𝚎𝚖𝚒𝚗𝚒\n・───────────・\n${reply}\n・──── >ᴗ< ────・`
        : "No reply received.";

      sendMessage(senderId, { text: message }, pageAccessToken);
    } catch (err) {
      console.error("Gemini Flash Error:", err?.response?.data || err.message);
      sendMessage(senderId, { text: "❎ | Failed to get a response from Gemini Flash." }, pageAccessToken);
    }
  }
};