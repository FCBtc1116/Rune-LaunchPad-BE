import winston from 'winston'
import { config } from 'dotenv'
import { isDevelopment } from '../utils/constants'

config()

const DB_URI: string = process.env.DB_URI || ''
const DB_NAME = process.env.DB_NAME || ''

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
}

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
}

winston.addColors(colors)

const formats = {
    console: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
        winston.format.prettyPrint(),
        winston.format.printf(
            (info) =>
                `${info.timestamp} ${info.label} ${info.level}: ${info.message} - ${
                    info.data ? JSON.stringify(info.data) : ''
                }`,
        ),
        winston.format.colorize({ all: true }),
        //parse json
        winston.format.splat(),
    ),
}

const transports = {
    console: new winston.transports.Console({
        level: 'debug',
        format: formats.console,
    }),
    // TODO add db log
}

const logger = winston.createLogger({
    levels,
    // transports: [transports.db],
})

if (isDevelopment) {
    logger.add(transports.console)
    logger.level = 'debug'
    logger.debug('Logging initialized at debug level')
}

logger.exitOnError = false

export default logger
