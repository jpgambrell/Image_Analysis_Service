import express, { Application } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger-spec';
import analysisRoutes from './routes/analysis.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { kafkaConsumer } from './services/kafka.consumer.service';
import { kafkaProducer } from './services/kafka.producer';
import { OllamaService } from './services/ollama.service';
import { DatabaseService } from './services/database.service';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

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
    message: 'Analysis service is healthy',
    timestamp: new Date().toISOString(),
    kafka: {
      consumer: kafkaConsumer.isReady() ? 'connected' : 'disconnected',
      producer: kafkaProducer.isReady() ? 'connected' : 'disconnected'
    }
  });
});

// API routes
app.use('/api', analysisRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize services and start server
async function startServer() {
  try {
    console.log('Initializing analysis service...');

    // Initialize database
    await DatabaseService.initialize();

    // Connect to Kafka (with retry logic)
    let kafkaConnected = false;
    let retries = 0;
    const maxRetries = 10;

    while (!kafkaConnected && retries < maxRetries) {
      try {
        // Connect producer
        await kafkaProducer.connect();

        // Connect consumer
        await kafkaConsumer.connect();
        await kafkaConsumer.subscribe();

        kafkaConnected = true;
      } catch (error) {
        retries++;
        console.log(`Kafka connection attempt ${retries}/${maxRetries} failed. Retrying in 5 seconds...`);
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          console.error('Failed to connect to Kafka after maximum retries');
          throw new Error('Could not connect to Kafka');
        }
      }
    }

    // Check Ollama availability and ensure model is loaded
    console.log('Checking Ollama availability...');
    const ollamaAvailable = await OllamaService.healthCheck();
    if (ollamaAvailable) {
      console.log('Ollama is available, ensuring model is loaded...');
      try {
        await OllamaService.ensureModel();
      } catch (error) {
        console.warn('Failed to ensure Ollama model:', error);
        console.log('Service will continue, but image analysis may fail until model is available');
      }
    } else {
      console.warn('Ollama is not available. Image analysis will fail until Ollama is running.');
    }

    // Start consuming messages
    await kafkaConsumer.startConsuming();

    // Start server
    app.listen(PORT, () => {
      console.log(`Analysis service running on port ${PORT}`);
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
  await kafkaConsumer.disconnect();
  await kafkaProducer.disconnect();
  await DatabaseService.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await kafkaConsumer.disconnect();
  await kafkaProducer.disconnect();
  await DatabaseService.close();
  process.exit(0);
});

startServer();
