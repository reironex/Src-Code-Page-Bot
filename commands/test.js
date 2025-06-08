const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: "tempmail",
  description: "Temporary email generator and inbox viewer.",
  usage: "tempmail gen | tempmail inbox [email]",
  author: "coffee",
  async execute(message, args) {
    const cmd = args[0];
    if (cmd === 'gen') {
      const inbox = `user${Math.floor(Math.random() * 100000)}`;
      return sendMessage(message.chat, `📧 Generated Temp Mail: **${inbox}@maildrop.cc**\nUse \`tempmail inbox ${inbox}@maildrop.cc\` to check messages.`);
    }
    
    if (cmd === 'inbox') {
      const email = args[1];
      if (!email) return sendMessage(message.chat, "❌ Please provide an email. Usage: `tempmail inbox user123@maildrop.cc`");
      const m = email.match(/^([^@]+)@maildrop\.cc$/);
      if (!m) return sendMessage(message.chat, "❌ Invalid email format. Must be like `something@maildrop.cc`.");
      
      try {
        const { data } = await axios.get(`https://maildrop.cc/api/inbox/${m[1]}`);
        const msgs = data.messages || [];
        if (!msgs.length) return sendMessage(message.chat, `📭 No messages in **${email}**.`);
        const latest = msgs[0];
        const reply = 
          `📬 Latest message for **${email}**\n` +
          `**Subject:** ${latest.subject}\n` +
          `**From:** ${latest.from}\n` +
          `**Time:** ${latest.time}\n` +
          `**Message ID:** ${latest.id}`;
        return sendMessage(message.chat, reply);
      } catch {
        return sendMessage(message.chat, "❌ Failed to fetch inbox. Make sure the email is correct.");
      }
    }
    
    return sendMessage(message.chat, "❌ Invalid usage. Use:\n- `tempmail gen`\n- `tempmail inbox [email]`");
  }
};