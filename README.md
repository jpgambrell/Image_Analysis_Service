# Kafka Image Service

A microservices-based image upload and analysis system built with Node.js/Express, Kafka, TypeScript, and Docker.

## Architecture

```
┌─────────────────┐      ┌──────────┐      ┌──────────────────┐
│ Upload Service  │─────>│  Kafka   │─────>│ Analysis Service │
│ (Port 3000)     │      │ (KRaft)  │      │ (Port 3001)      │
└────────┬────────┘      └──────────┘      └────────┬─────────┘
         │                                           │
         │                                           │
         ├───────────> Shared Volume <───────────────┤
         │               (Images)                    │
         │                                           │
         │         ┌──────────────────┐              │
         └────────>│   PostgreSQL     │<─────────────┘
                   │   (Port 5432)    │
                   └──────────────────┘

         ┌──────────────────┐
         │  Ollama/LLaVA    │
         │  (Port 11434)    │<───────────────────────┘
         └──────────────────┘

                    Observability Stack
         ┌────────────────────────────────────────────┐
         │                                            │
         │  ┌──────────┐   ┌──────┐   ┌──────────┐  │
         │  │ Promtail │──>│ Loki │──>│ Grafana  │  │
         │  │  (Agent) │   │(3100)│   │  (3002)  │  │
         │  └─────┬────┘   └──────┘   └──────────┘  │
         │        │                                   │
         │        └─> Collects logs from all         │
         │            Docker containers              │
         └────────────────────────────────────────────┘
```

## Features

### Upload Service
- HTTP REST API for image uploads
- File validation (size, format)
- Supported formats: JPEG, PNG, GIF, WebP
- Maximum file size: 10MB
- Kafka producer for upload events
- PostgreSQL database for image metadata persistence
- List and retrieve uploaded images
- Swagger API documentation

### Analysis Service
- Kafka consumer for upload events
- Ollama/LLaVA integration for AI-powered image analysis
- Extracts keywords, descriptions, and detected text from images
- PostgreSQL database for analysis results persistence
- REST API for querying analysis results
- Swagger API documentation

### Infrastructure
- Kafka in KRaft mode (no Zookeeper required)
- PostgreSQL 16 for persistent data storage
- Ollama with LLaVA vision model for image analysis
- Docker containerization for all services
- Shared volume for image file storage
- Health check endpoints

### Observability
- Grafana Loki for centralized log aggregation
- Promtail for log collection from all containers
- Grafana dashboards for visualization and tracing
- Correlation IDs to trace requests through the entire pipeline
- Real-time log streaming and querying

## Prerequisites

### For Docker Usage (Recommended)
- Docker and Docker Compose

### For Local Development (Optional)
- Node.js 20+
- npm or yarn

**Note:** If you're using Docker (recommended), you only need Docker installed. Node.js and npm are already included in the containers.

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
   - PostgreSQL database on port 5432
   - Ollama with LLaVA model on port 11434
   - Upload service on port 3000
   - Analysis service on port 3001
   - Loki (log aggregation) on port 3100
   - Grafana (dashboards) on port 3002
   - Promtail (log collection agent)

3. **Verify services are running**
   ```bash
   # Check upload service
   curl http://localhost:3000/health

   # Check analysis service
   curl http://localhost:3001/health
   ```

4. **Access web interfaces**
   - Upload Service API Docs: http://localhost:3000/api-docs
   - Analysis Service API Docs: http://localhost:3001/api-docs
   - **Grafana Dashboards**: http://localhost:3002 (username: `admin`, password: `admin`)
   - Loki API: http://localhost:3100

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
    "keywords": ["mountain", "landscape", "nature", "sunset"],
    "detectedText": ["Welcome", "National Park"],
    "description": "A scenic mountain landscape at sunset with vibrant colors in the sky.",
    "status": "completed"
  }
}
```

## API Documentation

Interactive API documentation is available via Swagger UI:

- **Upload Service**: http://localhost:3000/api-docs
- **Analysis Service**: http://localhost:3001/api-docs

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
DATABASE_URL=postgresql://imageservice:imageservice_password@postgres:5432/imageservice
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
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llava:latest
DATABASE_URL=postgresql://imageservice:imageservice_password@postgres:5432/imageservice
```

## Kafka Topics

The system uses two Kafka topics:

1. **image-uploaded**: Published by upload-service when an image is uploaded
2. **image-analyzed**: Published by analysis-service when analysis is complete

Topics are automatically created when first used (auto-create enabled).

## Database Schema

The system uses PostgreSQL with two main tables:

### `images` Table
Stores metadata for uploaded images:
- `id` (UUID) - Primary key
- `filename` - Stored filename
- `original_name` - Original upload filename
- `mimetype` - Image MIME type
- `size` - File size in bytes
- `uploaded_at` - Upload timestamp
- `path` - Storage path
- `created_at`, `updated_at` - Timestamps

### `image_analysis` Table
Stores AI analysis results:
- `id` (Serial) - Primary key
- `image_id` (UUID) - Foreign key to images table
- `filename` - Image filename
- `description` - AI-generated description
- `keywords` - Array of extracted keywords
- `detected_text` - Array of text found in image
- `status` - Analysis status (pending/processing/completed/failed)
- `error` - Error message if analysis failed
- `analyzed_at` - Analysis timestamp
- `created_at`, `updated_at` - Timestamps

The database schema is automatically initialized on first startup via [db/init.sql](db/init.sql).

## Observability & Log Tracing

The system uses **Grafana Loki Stack** for centralized logging and distributed tracing. This allows you to track an image's journey through the entire pipeline.

### Accessing Grafana

1. Open http://localhost:3002
2. Login with username: `admin`, password: `admin`
3. Navigate to **Dashboards** → **Image Processing Flow Dashboard**

### Tracing an Image Through the System

Each image upload gets a unique **correlationId** that follows it through:
1. **Upload Service** - Image received and saved
2. **Kafka** - Event published
3. **Analysis Service** - Event consumed, analysis performed
4. **Database** - Results stored

**To trace an image:**
1. In Grafana, go to the "Image Processing Flow Dashboard"
2. Enter an `imageId` or `correlationId` in the variable at the top
3. View all log entries for that specific image across all services

### Querying Logs with LogQL

Grafana Loki uses LogQL (like PromQL for logs). Here are useful queries:

```logql
# All logs for a specific image
{service=~"upload-service|analysis-service"} |= "your-image-id" | json

# All upload events
{service="upload-service"} |= "upload_start" | json

# All Kafka consume events
{service="analysis-service"} |= "kafka_consume" | json

# All completed analyses
{service="analysis-service"} |= "analysis_complete" | json

# All errors
{service=~"upload-service|analysis-service"} | json | level="error"

# Trace by correlation ID
{service=~"upload-service|analysis-service"} | json | correlationId="your-correlation-id"
```

### Structured JSON Logging

All services log in JSON format with these fields:
- `level`: Log level (info, error, warn)
- `message`: Human-readable message
- `imageId`: The image UUID
- `correlationId`: Trace ID for the entire flow
- `action`: What action occurred (upload_start, kafka_publish, analysis_complete, etc.)
- `service`: Which service generated the log
- Additional context-specific fields (filename, keywords, etc.)

Example log entry:
```json
{
  "level": "info",
  "message": "Image analysis completed",
  "imageId": "abc-123",
  "correlationId": "xyz-789",
  "action": "analysis_complete",
  "keywords": ["mountain", "landscape"]
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

### PostgreSQL Database

```bash
# Connect to database
docker exec -it postgres psql -U imageservice -d imageservice

# View images table
docker exec -it postgres psql -U imageservice -d imageservice -c "SELECT * FROM images;"

# View analysis results
docker exec -it postgres psql -U imageservice -d imageservice -c "SELECT * FROM image_analysis;"
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
- Ensure ports 3000, 3001, 3002, 3100, 5432, 9092, 9094, and 11434 are not in use
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

1. Add authentication and authorization
2. Implement image processing features (resize, compress, thumbnail generation)
3. Implement result caching (Redis)
4. Add monitoring and metrics (Prometheus, Grafana)
5. Implement retry logic for failed analyses
6. Add integration tests
7. Add pagination for list endpoints
8. Implement image deletion workflow

## License

ISC

## Contributing

This is a learning project. Feel free to experiment and enhance it!
