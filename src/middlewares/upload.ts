import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'

const storage = (directory: string) =>
    multer.diskStorage({
        destination: (req, file, cb) => {
            const dynamicDir = './public/' + directory + '/'
            cb(null, dynamicDir)
        },
        filename: (req, file, cb) => {
            const fileName = file.originalname.toLowerCase().split(' ').join('-')
            cb(null, uuidv4() + '-' + fileName)
        },
    })

var upload = (directory: string) =>
    multer({
        storage: storage(directory),
        fileFilter: (req, file, cb) => {
            if (
                file.mimetype === 'image/png' ||
                file.mimetype === 'image/jpg' ||
                file.mimetype === 'image/jpeg' ||
                file.mimetype === 'image/gif' || // Added for GIF images
                file.mimetype === 'image/webp' || // Added for WEBP images
                file.mimetype === 'image/svg+xml' || // Added for SVG images
                file.mimetype === 'application/zip' ||
                file.mimetype === 'application/x-zip-compressed' ||
                file.mimetype === 'multipart/x-zip' ||
                file.mimetype === 'application/x-rar-compressed' || // Added for RAR archives
                file.mimetype === 'application/octet-stream' || // Generic binary file (could be used for zip/rar if MIME type not detected correctly)
                file.mimetype === 'application/x-7z-compressed' // Added for 7z archives
            ) {
                cb(null, true)
            } else {
                cb(null, false)
                return cb(new Error('Only .png, .jpg and .jpeg format allowed!'))
            }
        },
        limits: {
            fieldSize: 5000000, // Increase the field size limit to 5MB
            fieldNameSize: 100, // Increase the field name size limit to 100 bytes
        },
    })

export default upload
