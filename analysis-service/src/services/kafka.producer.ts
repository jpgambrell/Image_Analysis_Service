import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import { ImageAnalysisResult } from '../types';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'analysis-service';
const KAFKA_TOPIC_ANALYSIS = process.env.KAFKA_TOPIC_ANALYSIS || 'image-analyzed';

export class KafkaProducerService {
  private kafka: Kafka;
  private producer: Producer;
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
    this.producer = this.kafka.producer();
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      this.isConnected = true;
      console.log('Kafka Producer connected successfully');
    } catch (error) {
      console.error('Failed to connect Kafka Producer:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      this.isConnected = false;
      console.log('Kafka Producer disconnected');
    } catch (error) {
      console.error('Error disconnecting Kafka Producer:', error);
    }
  }

  async publishAnalysisResult(result: ImageAnalysisResult): Promise<void> {
    if (!this.isConnected) {
      console.warn('Kafka Producer is not connected, skipping publish');
      return;
    }

    try {
      const record: ProducerRecord = {
        topic: KAFKA_TOPIC_ANALYSIS,
        messages: [
          {
            key: result.imageId,
            value: JSON.stringify(result),
            timestamp: Date.now().toString()
          }
        ]
      };

      await this.producer.send(record);
      console.log(`Published analysis result for image: ${result.imageId}`);
    } catch (error) {
      console.error('Error publishing analysis result:', error);
      throw error;
    }
  }

  isReady(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
export const kafkaProducer = new KafkaProducerService();
