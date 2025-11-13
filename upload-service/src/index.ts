import express, { Application } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger-spec';
import uploadRoutes from './routes/upload.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { StorageService } from './services/storage.service';
import { DatabaseService } from './services/database.service';
import { kafkaProducer } from './services/kafka.producer';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Upload service is healthy',
    timestamp: new Date().toISOString(),
    kafka: kafkaProducer.isReady() ? 'connected' : 'disconnected'
  });
});

// API routes
app.use('/api', uploadRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize services and start server
async function startServer() {
  try {
    console.log('Initializing services...');

    // Initialize database
    await DatabaseService.initialize();

    // Initialize storage
    await StorageService.initialize();

    // Connect to Kafka (with retry logic)
    let kafkaConnected = false;
    let retries = 0;
    const maxRetries = 10;

    while (!kafkaConnected && retries < maxRetries) {
      try {
        await kafkaProducer.connect();
        kafkaConnected = true;
      } catch (error) {
        retries++;
        console.log(`Kafka connection attempt ${retries}/${maxRetries} failed. Retrying in 5 seconds...`);
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          console.error('Failed to connect to Kafka after maximum retries');
          console.log('Starting server without Kafka connection. Upload events will not be published.');
        }
      }
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`Upload service running on port ${PORT}`);
      console.log(`API documentation available at http://localhost:${PORT}/api-docs`);
      console.log(`Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await kafkaProducer.disconnect();
  await DatabaseService.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await kafkaProducer.disconnect();
  await DatabaseService.close();
  process.exit(0);
});

startServer();
