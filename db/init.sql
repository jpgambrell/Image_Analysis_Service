-- Database initialization script for Image Service
-- Creates tables for storing image metadata and analysis results

-- Table for storing uploaded image metadata
CREATE TABLE IF NOT EXISTS images (
    id UUID PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mimetype VARCHAR(100) NOT NULL,
    size INTEGER NOT NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    path VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing image analysis results
CREATE TABLE IF NOT EXISTS image_analysis (
    id SERIAL PRIMARY KEY,
    image_id UUID NOT NULL UNIQUE REFERENCES images(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    description TEXT,
    keywords TEXT[], -- Array of keywords
    detected_text TEXT[], -- Array of detected text
    status VARCHAR(50) NOT NULL DEFAULT 'processing',
    error TEXT,
    analyzed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_images_uploaded_at ON images(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_images_filename ON images(filename);
CREATE INDEX IF NOT EXISTS idx_analysis_image_id ON image_analysis(image_id);
CREATE INDEX IF NOT EXISTS idx_analysis_status ON image_analysis(status);
CREATE INDEX IF NOT EXISTS idx_analysis_analyzed_at ON image_analysis(analyzed_at DESC);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on images table
CREATE TRIGGER update_images_updated_at BEFORE UPDATE ON images
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at on image_analysis table
CREATE TRIGGER update_analysis_updated_at BEFORE UPDATE ON image_analysis
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (already done via POSTGRES_USER but being explicit)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO imageservice;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO imageservice;
