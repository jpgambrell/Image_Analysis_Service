# Observability Stack - Quick Reference

This directory contains the configuration for the Grafana Loki observability stack.

## Components

### Loki (loki-config.yaml)
- **Purpose**: Log aggregation and storage
- **Port**: 3100
- **Storage**: Filesystem-based with 7-day retention
- **Access**: http://localhost:3100

### Promtail (promtail-config.yaml)
- **Purpose**: Log collection agent
- **Scrapes logs from**: All Docker containers via Docker socket
- **Labels**: Automatically tags logs with container name, service name, and project
- **Pipeline**: Parses JSON logs and extracts structured fields

### Grafana (grafana/)
- **Purpose**: Visualization and dashboards
- **Port**: 3002
- **Default credentials**: admin / admin
- **Access**: http://localhost:3002

## Quick Start

1. Start all services:
   ```bash
   docker-compose up -d
   ```

2. Access Grafana:
   - URL: http://localhost:3002
   - Login: admin / admin
   - Navigate to Dashboards → Image Processing Flow Dashboard

3. Upload an image:
   ```bash
   curl -X POST http://localhost:3000/api/upload -F "image=@test.jpg"
   ```

4. In Grafana, copy the `imageId` from the response and paste it into the dashboard variable to trace the image through the system.

## Correlation ID Tracing

Every image upload generates a unique `correlationId` that follows the image through:

1. **upload_start** - Image received by upload-service
2. **db_save** - Image metadata saved to PostgreSQL
3. **kafka_publish** - Upload event published to Kafka
4. **kafka_consume** - Analysis service receives event
5. **analysis_start** - Image marked as processing
6. **analysis_complete** - LLaVA analysis finished
7. **kafka_publish_result** - Results published to Kafka

## Useful LogQL Queries

### Trace a specific image
```logql
{service=~"upload-service|analysis-service"} |= "IMAGE_ID_HERE" | json
```

### View all uploads in last hour
```logql
{service="upload-service"} |= "upload_start" | json
```

### Monitor analysis performance
```logql
{service="analysis-service"} |= "analysis_complete" | json | line_format "{{.message}} - Keywords: {{.keywords}}"
```

### Find all errors
```logql
{service=~"upload-service|analysis-service"} | json | level="error"
```

### Calculate upload rate (per minute)
```logql
sum(rate({service="upload-service"} |= "upload_start" | json [1m]))
```

## Dashboard Panels

The Image Processing Flow Dashboard includes:

1. **Image Processing Flow - Trace by Image ID**: Main panel to trace a specific image
2. **Upload Service - New Uploads**: Stream of all new uploads
3. **Upload Service - Kafka Publish Events**: Kafka message publishing
4. **Analysis Service - Kafka Consume Events**: Kafka message consumption
5. **Analysis Service - Completed Analysis**: Finished analyses
6. **All Errors**: Error logs from all services
7. **Upload Rate**: Chart showing uploads per minute
8. **Analysis Completion Rate**: Chart showing analyses per minute

## Log Structure

All services emit structured JSON logs with these fields:

```json
{
  "level": "info",              // Log level
  "message": "...",             // Human-readable message
  "imageId": "uuid",            // Image identifier
  "correlationId": "uuid",      // Trace identifier
  "action": "upload_start",     // Action type
  "filename": "example.jpg",    // Original filename
  "service": "upload-service",  // Service name
  "timestamp": "2024-01-01T..."// ISO timestamp
}
```

## Troubleshooting

### Logs not appearing in Grafana
1. Check Promtail is running: `docker ps | grep promtail`
2. Check Promtail logs: `docker logs promtail`
3. Verify Loki is running: `curl http://localhost:3100/ready`

### Can't login to Grafana
- Default credentials: `admin` / `admin`
- Reset: `docker-compose restart grafana`

### Dashboard not showing data
1. Ensure Loki datasource is configured (should be automatic)
2. Check time range in top-right corner of Grafana
3. Verify logs are being generated: `docker-compose logs upload-service`

## Retention Policy

- **Logs**: Retained for 7 days (168 hours)
- **Storage location**: Docker volume `loki-data`
- To clear all logs: `docker-compose down -v` (WARNING: deletes all data)

## Performance Considerations

- Promtail scrapes logs every 5 seconds
- Loki ingestion rate: 16MB/s (configurable in loki-config.yaml)
- Grafana refresh rate: 5 seconds (configurable per dashboard)
- For high-volume systems, consider increasing resources or using object storage (S3/GCS) instead of filesystem

## Extending the Stack

### Add more dashboards
1. Create JSON dashboard file in `grafana/dashboards/`
2. Restart Grafana: `docker-compose restart grafana`

### Add alerting
Loki supports alerting via Prometheus Alertmanager. See [Loki alerting docs](https://grafana.com/docs/loki/latest/rules/).

### Export logs
Query Loki API directly:
```bash
curl -G -s "http://localhost:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={service="upload-service"}' \
  --data-urlencode 'start=1h' \
  | jq
```
