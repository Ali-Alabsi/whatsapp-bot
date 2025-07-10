const { getContentType } = require('@whiskeysockets/baileys');
const logger = require('./logger');

// Send text message
async function sendTextMessage(sock, jid, text, quoted = null) {
    try {
        await sock.sendMessage(jid, { text }, { quoted });
        logger.info(`Sent text message to ${jid}`);
    } catch (error) {
        logger.error('Error sending text message:', error);
        throw error;
    }
}

// Send image from URL
async function sendImageFromUrl(sock, jid, imageUrl, caption = '', quoted = null) {
    try {
        await sock.sendMessage(jid, {
            image: { url: imageUrl },
            caption: caption,
            mimetype: 'image/jpeg'
        }, { quoted });
        logger.info(`Sent image to ${jid}`);
    } catch (error) {
        logger.error('Error sending image:', error);
        throw error;
    }
}

// Send audio message
async function sendAudioMessage(sock, jid, audioUrl, ptt = true, quoted = null) {
    try {
        await sock.sendMessage(jid, {
            audio: { url: audioUrl },
            ptt: ptt,
            mimetype: 'audio/mp4'
        }, { quoted });
        logger.info(`Sent audio to ${jid}`);
    } catch (error) {
        logger.error('Error sending audio:', error);
        throw error;
    }
}

// Send button message
async function sendButtonMessage(sock, jid, text, buttons, quoted = null) {
    try {
        const buttonMessage = {
            text: text,
            footer: '© Your Bot Name',
            buttons: buttons,
            headerType: 1
        };
        
        await sock.sendMessage(jid, buttonMessage, { quoted });
        logger.info(`Sent button message to ${jid}`);
    } catch (error) {
        logger.error('Error sending button message:', error);
        throw error;
    }
}

module.exports = {
    sendTextMessage,
    sendImageFromUrl,
    sendAudioMessage,
    sendButtonMessage
};
