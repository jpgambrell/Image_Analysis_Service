# Kafka Image Service

A microservices-based image upload and analysis system built with Node.js/Express, Kafka, TypeScript, and Docker.

## Architecture

```
┌─────────────────┐      ┌──────────┐      ┌──────────────────┐
│ Upload Service  │─────>│  Kafka   │─────>│ Analysis Service │
│ (Port 3000)     │      │ (KRaft)  │      │ (Port 3001)      │
└─────────────────┘      └──────────┘      └──────────────────┘
        │                                            │
        └────────────> Shared Volume <──────────────┘
```

## Features

### Upload Service
- HTTP REST API for image uploads
- File validation (size, format)
- Supported formats: JPEG, PNG, GIF, WebP
- Maximum file size: 10MB
- Kafka producer for upload events
- Image metadata management
- List and retrieve uploaded images
- Swagger API documentation

### Analysis Service
- Kafka consumer for upload events
- Placeholder image analysis (ready for ollama/llava integration)
- Analysis results storage
- REST API for querying analysis results
- Swagger API documentation

### Infrastructure
- Kafka in KRaft mode (no Zookeeper required)
- Docker containerization for all services
- Shared volume for image storage
- Health check endpoints

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- npm or yarn

## Quick Start

### Using Docker Compose (Recommended)

1. **Clone or navigate to the project directory**
   ```bash
   cd KafkaImageService
   ```

2. **Build and start all services**
   ```bash
   docker-compose up --build
   ```

   This will start:
   - Kafka broker (KRaft mode) on ports 9092 (internal) and 9094 (external)
   - Upload service on port 3000
   - Analysis service on port 3001

3. **Verify services are running**
   ```bash
   # Check upload service
   curl http://localhost:3000/health

   # Check analysis service
   curl http://localhost:3001/health
   ```

4. **Access Swagger documentation**
   - Upload Service: http://localhost:3000/api-docs
   - Analysis Service: http://localhost:3001/api-docs

### Local Development (Without Docker)

1. **Start Kafka locally** (or use Docker for just Kafka)
   ```bash
   docker-compose up kafka
   ```

2. **Set up Upload Service**
   ```bash
   cd upload-service
   cp .env.example .env
   npm install
   npm run dev
   ```

3. **Set up Analysis Service** (in another terminal)
   ```bash
   cd analysis-service
   cp .env.example .env
   npm install
   npm run dev
   ```

## Usage

### Upload an Image

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "image=@/path/to/your/image.jpg"
```

Response:
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "id": "uuid-here",
    "filename": "uuid.jpg",
    "originalName": "image.jpg",
    "mimetype": "image/jpeg",
    "size": 12345,
    "uploadedAt": "2024-01-01T00:00:00.000Z",
    "path": "/api/images/uuid-here"
  }
}
```

### List All Images

```bash
curl http://localhost:3000/api/images
```

### Get a Specific Image

```bash
curl http://localhost:3000/api/images/{imageId} --output image.jpg
```

### Get Image Metadata

```bash
curl http://localhost:3000/api/images/{imageId}/info
```

### Get Analysis Results

```bash
# Get all analysis results
curl http://localhost:3001/api/analysis

# Get analysis for specific image
curl http://localhost:3001/api/analysis/{imageId}
```

Response:
```json
{
  "success": true,
  "data": {
    "imageId": "uuid-here",
    "filename": "uuid.jpg",
    "analyzedAt": "2024-01-01T00:00:00.000Z",
    "keywords": ["placeholder", "pending-integration", "awaiting-llava"],
    "detectedText": ["Text detection pending ollama/llava integration"],
    "description": "This is a placeholder analysis result.",
    "status": "completed"
  }
}
```

## API Documentation

Interactive API documentation is available via Swagger UI:

- **Upload Service**: http://localhost:3000/api-docs
- **Analysis Service**: http://localhost:3001/api-docs

## Project Structure

```
KafkaImageService/
├── upload-service/
│   ├── src/
│   │   ├── index.ts                 # Entry point
│   │   ├── routes/
│   │   │   └── upload.routes.ts     # Route definitions
│   │   ├── controllers/
│   │   │   └── upload.controller.ts # Request handlers
│   │   ├── services/
│   │   │   ├── storage.service.ts   # Image storage management
│   │   │   └── kafka.producer.ts    # Kafka producer
│   │   ├── middleware/
│   │   │   ├── validation.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── config/
│   │   │   └── swagger.ts           # Swagger configuration
│   │   └── types/
│   │       └── index.ts             # TypeScript types
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── .env.example
├── analysis-service/
│   ├── src/
│   │   ├── index.ts                 # Entry point
│   │   ├── routes/
│   │   │   └── analysis.routes.ts
│   │   ├── controllers/
│   │   │   └── analysis.controller.ts
│   │   ├── services/
│   │   │   ├── kafka.consumer.service.ts
│   │   │   ├── kafka.producer.ts
│   │   │   └── image.analysis.service.ts
│   │   ├── middleware/
│   │   │   └── error.middleware.ts
│   │   ├── config/
│   │   │   └── swagger.ts
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Configuration

### Upload Service Environment Variables

```env
PORT=3000
NODE_ENV=development
KAFKA_BROKERS=kafka:9092
KAFKA_CLIENT_ID=upload-service
KAFKA_TOPIC_UPLOAD=image-uploaded
UPLOAD_DIR=/app/images
MAX_FILE_SIZE=10485760
ALLOWED_FORMATS=image/jpeg,image/png,image/gif,image/webp
```

### Analysis Service Environment Variables

```env
PORT=3001
NODE_ENV=development
KAFKA_BROKERS=kafka:9092
KAFKA_CLIENT_ID=analysis-service
KAFKA_GROUP_ID=analysis-group
KAFKA_TOPIC_UPLOAD=image-uploaded
KAFKA_TOPIC_ANALYSIS=image-analyzed
IMAGES_DIR=/app/images
```

## Kafka Topics

The system uses two Kafka topics:

1. **image-uploaded**: Published by upload-service when an image is uploaded
2. **image-analyzed**: Published by analysis-service when analysis is complete

Topics are automatically created when first used (auto-create enabled).

## Integration with ollama/llava

The analysis service includes a placeholder implementation for image analysis. To integrate with your existing ollama/llava project:

1. Locate the analysis logic in [analysis-service/src/services/image.analysis.service.ts](analysis-service/src/services/image.analysis.service.ts)
2. Replace the `analyzeImage` method with your ollama/llava integration
3. Update the response structure if needed to include your analysis results

Example integration point:
```typescript
static async analyzeImage(imageId: string, filename: string): Promise<ImageAnalysisResult> {
  // TODO: Replace with actual ollama/llava API call
  // const response = await fetch('http://ollama:11434/api/generate', {...});
  // Parse response and extract keywords, text, description

  const result: ImageAnalysisResult = {
    imageId,
    filename,
    analyzedAt: new Date(),
    keywords: [], // From ollama/llava
    detectedText: [], // From ollama/llava
    description: '', // From ollama/llava
    status: 'completed'
  };

  return result;
}
```

## Monitoring and Debugging

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f upload-service
docker-compose logs -f analysis-service
docker-compose logs -f kafka
```

### Health Checks

```bash
# Upload service
curl http://localhost:3000/health

# Analysis service
curl http://localhost:3001/health
```

### Kafka Topics

```bash
# List topics
docker exec -it kafka kafka-topics.sh --bootstrap-server localhost:9092 --list

# Describe a topic
docker exec -it kafka kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic image-uploaded

# Consume messages (for debugging)
docker exec -it kafka kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic image-uploaded --from-beginning
```

## Stopping and Cleaning Up

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clears all data)
docker-compose down -v

# Rebuild services
docker-compose up --build
```

## Troubleshooting

### Services won't start
- Ensure ports 3000, 3001, 9092, and 9094 are not in use
- Check Docker daemon is running
- Verify sufficient disk space for Docker volumes

### Kafka connection issues
- Wait for Kafka to be fully ready (can take 30-60 seconds)
- Check Kafka logs: `docker-compose logs kafka`
- Verify network connectivity between containers

### Image upload fails
- Check file size is under 10MB
- Verify file format is supported (JPEG, PNG, GIF, WebP)
- Check upload service logs for details

## Next Steps

1. Integrate ollama/llava for actual image analysis
2. Add authentication and authorization
3. Implement image processing features (resize, compress)
4. Add database for persistent metadata storage
5. Implement result caching
6. Add monitoring and metrics (Prometheus, Grafana)
7. Implement retry logic for failed analyses
8. Add integration tests

## License

ISC

## Contributing

This is a learning project. Feel free to experiment and enhance it!
