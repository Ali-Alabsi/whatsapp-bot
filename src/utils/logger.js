const winston = require('winston');
const path = require('path');
const config = require('../config/config');
const { format, transports } = winston;

// Create a simple console logger for Baileys
const baileysLogger = {
    level: 'info',
    trace: () => {},
    debug: (message, ...args) => console.debug(`[DEBUG] ${message}`, ...args),
    info: (message, ...args) => console.log(`[INFO] ${message}`, ...args),
    warn: (message, ...args) => console.warn(`[WARN] ${message}`, ...args),
    error: (message, ...args) => console.error(`[ERROR] ${message}`, ...args),
    fatal: (message, ...args) => console.error(`[FATAL] ${message}`, ...args),
    child: () => baileysLogger
};

const logFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
);

const consoleFormat = format.combine(
    format.colorize(),
    format.printf(({ level, message, timestamp, stack }) => {
        if (stack) {
            return `${timestamp} ${level}: ${message}\n${stack}`;
        }
        return `${timestamp} ${level}: ${message}`;
    })
);

const logger = winston.createLogger({
    level: config.logging.level || 'info',
    format: logFormat,
    defaultMeta: { service: 'whatsapp-bot' },
    transports: [
        new transports.Console({
            format: consoleFormat
        }),
        new transports.File({
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new transports.File({
            filename: path.join(__dirname, '../../logs/combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ],
    exceptionHandlers: [
        new transports.File({
            filename: path.join(__dirname, '../../logs/exceptions.log')
        })
    ],
    exitOnError: false
});

// Create a stream for morgan
logger.stream = {
    write: (message) => {
        logger.info(message.trim());
    }
};

// Export both loggers
module.exports = {
    // Main application logger
    logger,
    // Baileys-compatible logger
    baileysLogger
};
