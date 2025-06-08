const axios = require('axios');

module.exports = {
    name: "tempmail",
    description: "Temporary email generator and inbox viewer.",
    usage: "tempmail gen | tempmail inbox [email]",
    author: "ChatGPT",
    async execute(message, args, client) {
        const subCommand = args[0];

        if (subCommand === 'gen') {
            // Generate random inbox
            const inbox = `user${Math.floor(Math.random() * 100000)}`;
            const email = `${inbox}@maildrop.cc`;

            await message.reply(`📧 Generated Temp Mail: **${email}**\nUse \`tempmail inbox ${email}\` to check messages.`);

        } else if (subCommand === 'inbox') {
            if (!args[1]) {
                return await message.reply("❌ Please provide an email. Example: `tempmail inbox user12345@maildrop.cc`");
            }

            const email = args[1];
            const inboxMatch = email.match(/^([^@]+)@maildrop\.cc$/);

            if (!inboxMatch) {
                return await message.reply("❌ Invalid email format. Must be like `something@maildrop.cc`.");
            }

            const inbox = inboxMatch[1];

            try {
                const inboxUrl = `https://maildrop.cc/api/inbox/${inbox}`;
                const response = await axios.get(inboxUrl);
                const messages = response.data.messages || [];

                if (messages.length === 0) {
                    return await message.reply(`📭 No messages in **${email}**.`);
                }

                // Show the latest message
                const latest = messages[0];

                let reply = `📬 Latest message for **${email}**\n`;
                reply += `**Subject:** ${latest.subject}\n`;
                reply += `**From:** ${latest.from}\n`;
                reply += `**Time:** ${latest.time}\n`;
                reply += `**Message ID:** ${latest.id}\n\n`;
                reply += `To read full message: visit https://maildrop.cc/inbox/${inbox}`;

                await message.reply(reply);

            } catch (err) {
                console.error(err);
                await message.reply("❌ Failed to fetch inbox. Make sure the email is correct.");
            }

        } else {
            // Unknown subcommand
            await message.reply("❌ Invalid usage. Use:\n- `tempmail gen` to generate an email\n- `tempmail inbox [email]` to check inbox.");
        }
    }
};