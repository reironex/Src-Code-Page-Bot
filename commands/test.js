const { Hercai } = require("hercai");
const axios = require("axios");
const { sendMessage } = require("../handles/sendMessage");

const hercai = new Hercai({}); // Safe constructor
const imageCache = new Map(); // For temporary image reuse
const conversationHistory = new Map(); // Per-sender memory
const HISTORY_LIMIT = 10; // Messages to remember per user

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
  description: 'Ask Hercai AI anything, including image replies.',
  usage: '\nhercai [question or reply to image]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken, event) {
    if (!event) {
      return sendMessage(senderId, { text: "Something went wrong." }, pageAccessToken);
    }

    const prompt = args.join(" ").trim();

    // First try reply_to image
    let imageUrl = await getImageUrl(event, pageAccessToken);

    // If none, fallback to cached image if available
    if (!imageUrl && imageCache.has(senderId)) {
      const cached = imageCache.get(senderId);
      if (Date.now() - cached.timestamp <= 5 * 60 * 1000) {
        imageUrl = cached.url;
        console.log(`Using cached image for sender ${senderId}: ${imageUrl}`);
      }
    }

    if (!prompt && !imageUrl) {
      return sendMessage(senderId, { text: "Hello!" }, pageAccessToken);
    }

    let content;

    if (imageUrl) {
      try {
        const imageRes = await axios.get(imageUrl, { responseType: "arraybuffer" });
        const base64Image = `data:image/jpeg;base64,${Buffer.from(imageRes.data).toString("base64")}`;

        content = prompt
          ? [
              { type: "image", image_url: { url: base64Image } },
              { type: "text", text: prompt }
            ]
          : [
              { type: "image", image_url: { url: base64Image } }
            ];

        imageCache.set(senderId, {
          url: imageUrl,
          timestamp: Date.now()
        });
      } catch (err) {
        console.error("Image processing failed:", err.message);
        return sendMessage(senderId, { text: "Failed to process the image." }, pageAccessToken);
      }
    } else {
      content = prompt;
    }

    // Build message history for Hercai
    const history = conversationHistory.get(senderId) || [];
    history.push({ role: "user", content });

    try {
      const response = await hercai.chat.completions.create({
        messages: history.slice(-HISTORY_LIMIT),
        model: "google/Gemma-3-12b-it",
        stream: true
      });

      let fullReply = "";
      for await (const chunk of response) {
        if (chunk.reply) fullReply += chunk.reply;
      }

      history.push({ role: "assistant", content: fullReply });
      conversationHistory.set(senderId, history.slice(-HISTORY_LIMIT));

      sendMessage(senderId, { text: `💬 Hercai AI\n\n${fullReply.trim()}` }, pageAccessToken);
    } catch (err) {
      console.error("Hercai API Error:", err.message);
      sendMessage(senderId, { text: "Failed to get a response from Hercai." }, pageAccessToken);
    }
  }
};