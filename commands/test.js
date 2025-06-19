const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const GEMINI_API_KEY = 'AIzaSyAowq5pmdXV8GZ4xJrGKSgjsQQ3Ds48Dlg';
const conversations = new Map();

// Bold Unicode maps
const boldMap = {
  a: '𝗮', b: '𝗯', c: '𝗰', d: '𝗱', e: '𝗲', f: '𝗳', g: '𝗴',
  h: '𝗵', i: '𝗶', j: '𝗷', k: '𝗸', l: '𝗹', m: '𝗺', n: '𝗻',
  o: '𝗼', p: '𝗽', q: '𝗾', r: '𝗿', s: '𝘀', t: '𝘁', u: '𝘂',
  v: '𝘃', w: '𝘄', x: '𝘅', y: '𝘆', z: '𝘇',
  A: '𝗔', B: '𝗕', C: '𝗖', D: '𝗗', E: '𝗘', F: '𝗙', G: '𝗚',
  H: '𝗛', I: '𝗜', J: '𝗝', K: '𝗞', L: '𝗟', M: '𝗠', N: '𝗡',
  O: '𝗢', P: '𝗣', Q: '𝗤', R: '𝗥', S: '𝗦', T: '𝗧', U: '𝗨',
  V: '𝗩', W: '𝗪', X: '𝗫', Y: '𝗬', Z: '𝗭',
  0: '𝟬', 1: '𝟭', 2: '𝟮', 3: '𝟯', 4: '𝟰', 5: '𝟱', 6: '𝟲', 7: '𝟳', 8: '𝟴', 9: '𝟵'
};

// Replace **bold** with Unicode bold
function formatBoldText(text) {
  return text.replace(/\*\*(.*?)\*\*/g, (_, match) => {
    return [...match].map(char => boldMap[char] || char).join('') + '\n';
  });
}

// Auto-insert paragraph breaks
function autoFormatParagraphs(text) {
  return text
    .replace(/([.:!?])\s+/g, '$1\n')          // Break after punctuation
    .replace(/(?<=\n)([A-Z])/g, '\n$1')        // Break before new paragraphs
    .replace(/\n{2,}/g, '\n');                 // Remove excessive line breaks
}

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
  description: 'Interact with Google Gemini.',
  usage: 'ai [question]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken, event, sendMessage, imageCache) {
    const prompt = args.join(' ').trim();
    if (!prompt) {
      return sendMessage(senderId, { text: "Ask me something!" }, pageAccessToken);
    }

    let imageUrl = await getImageUrl(event, pageAccessToken);

    if (!imageUrl && imageCache) {
      const cached = imageCache.get(senderId);
      if (cached && Date.now() - cached.timestamp <= 5 * 60 * 1000) {
        imageUrl = cached.url;
        console.log(`Using cached image for sender ${senderId}: ${imageUrl}`);
      }
    }

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
        return sendMessage(senderId, { text: "❎ | Failed to process the image." }, pageAccessToken);
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

      let reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (reply) {
        reply = formatBoldText(reply);
        reply = autoFormatParagraphs(reply);
        history.push({ role: "model", parts: [{ text: reply }] });
        conversations.set(senderId, history.slice(-20));
      }

      if (reply) {
        const prefix = "💬 | 𝙶𝚘𝚘𝚐𝚕𝚎 𝙶𝚎𝚖𝚒𝚗𝚒\n・───────────・\n";
        const suffix = "\n・──── >ᴗ< ────・";
        const chunks = [];

        let remaining = reply;
        while (remaining.length > 0) {
          const slice = remaining.slice(0, 1900);
          chunks.push(slice);
          remaining = remaining.slice(1900);
        }

        if (chunks.length === 1) {
          sendMessage(senderId, { text: prefix + chunks[0] + suffix }, pageAccessToken);
        } else {
          sendMessage(senderId, { text: prefix + chunks[0] }, pageAccessToken);
          for (let i = 1; i < chunks.length - 1; i++) {
            sendMessage(senderId, { text: chunks[i] }, pageAccessToken);
          }
          sendMessage(senderId, { text: chunks[chunks.length - 1] + suffix }, pageAccessToken);
        }
      } else {
        sendMessage(senderId, { text: "No reply received." }, pageAccessToken);
      }
    } catch (err) {
      console.error("Gemini Flash Error:", err?.response?.data || err.message);
      sendMessage(senderId, { text: "❎ | Failed to get a response from Gemini Flash." }, pageAccessToken);
    }
  }
};