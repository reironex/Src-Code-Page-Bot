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
  name: 'test',
  description: 'Ask Gemini 2.0 Flash with conversation and optional image',
  usage: '\ngemini [message]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken, event) {
    const prompt = args.join(' ').trim();
    if (!prompt) {
      return sendMessage(senderId, { text: "Ask me something!" }, pageAccessToken);
    }

    const imageUrl = await getImageUrl(event, pageAccessToken);
    let imagePart = null;

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
        return sendMessage(senderId, { text: "Failed to process the image." }, pageAccessToken);
      }
    }

    const history = conversations.get(senderId) || [];
    const userParts = imagePart ? [{ text: prompt }, imagePart] : [{ text: prompt }];
    history.push({ role: "user", parts: userParts });

    const payload = {
      contents: history,
      generationConfig: { responseMimeType: "text/plain" }
    };

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

      sendMessage(senderId, {
        text: reply ? `⚡ Gemini Flash\n\n${reply}` : "No reply received."
      }, pageAccessToken);
    } catch (err) {
      console.error("Gemini Flash Error:", err?.response?.data || err.message);
      sendMessage(senderId, { text: "Failed to get a response from Gemini Flash." }, pageAccessToken);
    }
  }
};