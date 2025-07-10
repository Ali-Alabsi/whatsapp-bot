# 🤖 WhatsApp Bot with Node.js and Baileys

An advanced WhatsApp bot built with Node.js and the Baileys library, featuring auto-replies, scheduled messages, and more.

## ✨ Features

- 📱 Connect to WhatsApp using QR code
- 🤖 Auto-reply to messages based on keywords
- ⏰ Schedule messages (e.g., daily greetings)
- 📝 Command system with `/` prefix
- 🌍 Multi-language support (Arabic/English)
- 📊 SQLite database for data persistence
- 📝 Logging system
- 🔒 Admin commands for management

## 🚀 Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn
- WhatsApp account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/whatsapp-bot.git
   cd whatsapp-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Configure the bot:
   - Copy `.env.example` to `.env` and update the values
   - Modify `src/config/config.js` as needed

4. Start the bot:
   ```bash
   npm start
   # or for development with auto-restart
   npm run dev
   ```

5. Scan the QR code with your WhatsApp app to link the bot

## 🛠️ Configuration

Edit `src/config/config.js` to customize:

- Bot name and prefix
- Admin phone number
- Auto-replies
- Scheduled messages
- Database settings

## 📋 Available Commands

- `/help` - Show all commands
- `/status` - Show bot status
- `/quote` - Get a random quote
- `/joke` - Get a random joke
- `/menu` - Show interactive menu

### Admin Commands

- `/broadcast <message>` - Send a message to all users
- `/debug` - Show debug information

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Baileys](https://github.com/WhiskeySockets/Baileys) - The amazing WhatsApp Web API
- All contributors and users who provided feedback
