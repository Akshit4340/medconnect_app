import 'dotenv/config';
import winston from 'winston';

const isDev = process.env.NODE_ENV === 'development';

export const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',

  format: isDev
    ? // Human-readable format for development
      winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length
            ? '\n' + JSON.stringify(meta, null, 2)
            : '';
          return `${timestamp} [${level}]: ${message}${metaStr}`;
        }),
      )
    : // JSON format for production (easy to parse by log aggregators)
      winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),

  transports: [
    new winston.transports.Console(),
    // In production you'd add a File or cloud transport here
  ],
});
