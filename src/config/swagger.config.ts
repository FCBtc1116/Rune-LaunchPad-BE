import swaggerJSDoc, { type Options } from 'swagger-jsdoc'

const options: Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Ordinal Genesis API',
            version: '1.0.0',
            description: '',
        },
        basePath: '/',
    },
    apis: ['./src/routes/*.router.ts'],
}

const swaggerSpec = swaggerJSDoc(options)

export default swaggerSpec
