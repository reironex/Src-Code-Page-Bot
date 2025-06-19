const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const GEMINI_API_KEY = 'AIzaSyAowq5pmdXV8GZ4xJrGKSgjsQQ3Ds48Dlg';
const conversations = new Map();

// Bold font map
const boldMap = Object.fromEntries(
  [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789']
    .map(c => [c, String.fromCodePoint(c.charCodeAt(0) + (/[a-z]/.test(c) ? 0x1D41A - 97 : /[A-Z]/.test(c) ? 0x1D400 - 65 : 0x1D7CE - 48))])
);

// Format **bold** to Unicode + add spacing
const formatBold = text =>
  text.replace(/\*\*(.+?)\*\*/g, (_, m) =>
    [...m].map(c => boldMap[c] || c).join('') + '\n\n'
  );

// Format paragraphs with line breaks
const formatParagraphs = text =>
  text.replace(/([.!?])\s+/g, '$1\n').replace(/\n{2,}/g, '\n\n');

const getImageUrl = async (e, token) => {
  const mid = e?.message?.reply_to?.mid || e?.message?.mid;
  if (!mid) return null;
  try {
    const { data } = await axios.get(`https://graph.facebook.com/v22.0/${mid}/attachments`, {
      params: { access_token: token }
    });
    return data?.data?.[0]?.image_data?.url || data?.data?.[0]?.file_url || null;
  } catch (e) {
    console.error("Image fetch error:", e?.response?.data || e.message);
    return null;
  }
};

module.exports = {
  name: 'test',
  description: 'Interact with Google Gemini.',
  usage: 'ai [question]',
  author: 'coffee',

  async execute(senderId, args, token, event, sendMessage, imageCache) {
    const prompt = args.join(' ').trim();
    if (!prompt) return sendMessage(senderId, { text: "Ask me something!" }, token);

    let url = await getImageUrl(event, token);
    if (!url && imageCache?.get(senderId)?.url) {
      const cached = imageCache.get(senderId);
      if (Date.now() - cached.timestamp <= 300000) url = cached.url;
    }

    let imagePart = null;
    if (url) {
      try {
        const res = await axios.get(url, { responseType: 'arraybuffer' });
        imagePart = {
          inline_data: {
            mimeType: res.headers['content-type'],
            data: Buffer.from(res.data).toString('base64')
          }
        };
      } catch (e) {
        return sendMessage(senderId, { text: "❎ | Failed to process the image." }, token);
      }
    }

    const history = conversations.get(senderId) || [];
    history.push({ role: "user", parts: imagePart ? [{ text: prompt }, imagePart] : [{ text: prompt }] });

    try {
      const { data } = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        { contents: history, generationConfig: { responseMimeType: "text/plain" } },
        { headers: { 'Content-Type': 'application/json' } }
      );

      let reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!reply) return sendMessage(senderId, { text: "No reply received." }, token);

      reply = formatParagraphs(formatBold(reply));
      history.push({ role: "model", parts: [{ text: reply }] });
      conversations.set(senderId, history.slice(-20));

      const prefix = "💬 | 𝙶𝚘𝚘𝚐𝚕𝚎 𝙶𝚎𝚖𝚒𝚗𝚒\n・───────────・\n";
      const suffix = "\n・──── >ᴗ< ────・";
      const chunks = reply.match(/[\s\S]{1,1900}/g);

      for (let i = 0; i < chunks.length; i++) {
        const part = (i === 0 ? prefix : '') + chunks[i] + (i === chunks.length - 1 ? suffix : '');
        await sendMessage(senderId, { text: part }, token);
      }
    } catch (e) {
      console.error("Gemini error:", e?.response?.data || e.message);
      sendMessage(senderId, { text: "❎ | Gemini Flash error." }, token);
    }
  }
};