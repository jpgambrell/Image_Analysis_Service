import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Analysis Service API',
      version: '1.0.0',
      description: 'Image analysis microservice with Kafka consumer integration',
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3001}`,
        description: 'Development server'
      }
    ],
    tags: [
      {
        name: 'Analysis',
        description: 'Image analysis endpoints'
      },
      {
        name: 'Health',
        description: 'Health check endpoints'
      }
    ]
  },
  apis: [
    './dist/routes/*.js',
    './dist/controllers/*.js',
    './src/routes/*.ts',
    './src/controllers/*.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);
