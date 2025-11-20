import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { ImageUploadEvent } from '../types';
import { ImageAnalysisService } from './image.analysis.service';
import { kafkaProducer } from './kafka.producer';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'analysis-service';
const KAFKA_GROUP_ID = process.env.KAFKA_GROUP_ID || 'analysis-group';
const KAFKA_TOPIC_UPLOAD = process.env.KAFKA_TOPIC_UPLOAD || 'image-uploaded';

export class KafkaConsumerService {
  private kafka: Kafka;
  private consumer: Consumer;
  private isConnected: boolean = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: KAFKA_CLIENT_ID,
      brokers: KAFKA_BROKERS,
      retry: {
        initialRetryTime: 300,
        retries: 10
      }
    });
    this.consumer = this.kafka.consumer({ groupId: KAFKA_GROUP_ID });
  }

  async connect(): Promise<void> {
    try {
      await this.consumer.connect();
      this.isConnected = true;
      console.log('Kafka Consumer connected successfully');
    } catch (error) {
      console.error('Failed to connect Kafka Consumer:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.consumer.disconnect();
      this.isConnected = false;
      console.log('Kafka Consumer disconnected');
    } catch (error) {
      console.error('Error disconnecting Kafka Consumer:', error);
    }
  }

  async subscribe(): Promise<void> {
    try {
      await this.consumer.subscribe({
        topic: KAFKA_TOPIC_UPLOAD,
        fromBeginning: true
      });
      console.log(`Subscribed to topic: ${KAFKA_TOPIC_UPLOAD}`);
    } catch (error) {
      console.error('Failed to subscribe to topic:', error);
      throw error;
    }
  }

  async startConsuming(): Promise<void> {
    try {
      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        }
      });
      console.log('Kafka Consumer is running and listening for messages');
    } catch (error) {
      console.error('Error in consumer run:', error);
      throw error;
    }
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;

    try {
      if (!message.value) {
        console.warn('Received message with no value');
        return;
      }

      const eventData: ImageUploadEvent = JSON.parse(message.value.toString());
      const correlationId = eventData.correlationId || 'unknown';

      console.log(JSON.stringify({
        level: 'info',
        message: 'Received upload event from Kafka',
        imageId: eventData.imageId,
        correlationId,
        action: 'kafka_consume',
        filename: eventData.filename
      }));

      // Mark as processing
      await ImageAnalysisService.markAsProcessing(eventData.imageId, eventData.filename);
      console.log(JSON.stringify({
        level: 'info',
        message: 'Image marked as processing',
        imageId: eventData.imageId,
        correlationId,
        action: 'analysis_start'
      }));

      // Analyze the image
      const result = await ImageAnalysisService.analyzeImage(
        eventData.imageId,
        eventData.path
      );
      console.log(JSON.stringify({
        level: 'info',
        message: 'Image analysis completed',
        imageId: eventData.imageId,
        correlationId,
        action: 'analysis_complete',
        keywords: result.keywords
      }));

      // Publish analysis result to Kafka
      await kafkaProducer.publishAnalysisResult(result);
      console.log(JSON.stringify({
        level: 'info',
        message: 'Analysis result published to Kafka',
        imageId: eventData.imageId,
        correlationId,
        action: 'kafka_publish_result'
      }));
    } catch (error) {
      console.error('Error processing message:', error);

      // Try to parse the message to get imageId for error tracking
      try {
        if (message.value) {
          const eventData: ImageUploadEvent = JSON.parse(message.value.toString());
          await ImageAnalysisService.markAsFailed(
            eventData.imageId,
            eventData.filename,
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      } catch (parseError) {
        console.error('Could not parse message for error tracking:', parseError);
      }
    }
  }

  isReady(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
export const kafkaConsumer = new KafkaConsumerService();
