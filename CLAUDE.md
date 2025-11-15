# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Node.js Express service that generates dynamic images by compositing logos and text onto SVG templates using the Sharp library. The service uses a **generic template system** where templates are defined by JSON configuration files that specify logo positioning, sizing, and default variables. Templates accept arbitrary parameters that are dynamically replaced in the SVG markup.

## Running the Service

### Local Development

Start the server:
```bash
node server.js
# or
npm start
```

The API runs on port 3000 by default.

### Docker Deployment

The service includes full Docker support with multi-stage builds for optimized production deployment.

#### Using Docker Compose (Recommended)

```bash
# Build and start the service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

#### Using Docker CLI

```bash
# Build the image
docker build -t sharp-image-service .

# Run the container
docker run -d \
  --name sharp-image-service \
  -p 3000:3000 \
  -v $(pwd)/templates:/app/templates:ro \
  -e TEMPLATES_DIR=/app/templates \
  sharp-image-service

# Check health
docker ps
curl http://localhost:3000/health
```

#### Environment Variables

The service supports the following environment variables:

- `TEMPLATES_DIR`: Path to templates directory (default: `./templates`)
- `PORT`: HTTP port for the service (default: `3000`)
- `NODE_ENV`: Node environment (default: `production` in Docker)

#### Health Check

The service exposes a health check endpoint:
- **Endpoint**: `GET /health`
- **Response**: `{"status": "ok"}`
- **Use case**: Docker health checks, load balancers, monitoring tools

## Architecture

### API Endpoints

The service exposes the following endpoints:

#### POST /generate

Main endpoint that handles all image generation:

**Request body:**
- `template`: (required) Filename of the SVG template (from `templates/` directory, e.g., "futebol.svg")
- **Logo parameters**: Named according to the template's config file (e.g., `logo1`, `logo2`)
  - Values can be either:
    - HTTP/HTTPS URLs: The service fetches and processes the remote image
    - Data URIs: Base64-encoded images (e.g., `data:image/png;base64,iVBORw0...`)
- **Any other parameters**: Arbitrary key-value pairs that replace `{{KEY}}` placeholders in the SVG
  - Keys are automatically uppercased when matching placeholders
  - Example: `"titulo": "FINAL MATCH"` replaces `{{TITULO}}` in the SVG
  - Unmatched parameters are ignored
  - Missing parameters use defaults from the template config file

**Response:** PNG image buffer with Content-Type: image/png

**Example request:**
```json
{
  "template": "futebol.svg",
  "logo1": "https://example.com/team1-logo.png",
  "logo2": "data:image/png;base64,iVBORw0KGg...",
  "titulo": "COPA FINAL",
  "data": "15 NOV 2025",
  "hora": "16:00",
  "estadio": "MARACANÃ",
  "time1Cor1": "#FF0000",
  "time1Cor2": "#AA0000"
}
```

#### GET /health

Health check endpoint for monitoring and container orchestration:

**Response:** `{"status": "ok"}` with HTTP 200

Used by Docker healthchecks, Kubernetes liveness/readiness probes, and load balancers.

### Image Processing Pipeline

1. **Config Loading**: Reads template's companion JSON config file (e.g., `futebol.json`)
2. **Template Loading**: Reads SVG template from `templates/` directory as UTF-8 string
3. **Variable Replacement**: Merges request parameters with config defaults, then replaces all `{{KEY}}` placeholders in the SVG
4. **Logo Source Detection**: For each logo parameter:
   - If value starts with `data:image/` → decode base64 data URI
   - Otherwise → fetch remote image via node-fetch
5. **Logo Processing**: Uses Sharp to resize each logo according to dimensions in config file
6. **Composition**: Sharp renders the modified SVG and composites logos on top using positions from config:
   - Logo count, positions, and sizes are all config-driven
   - Each logo is composited as a separate layer at specified coordinates
7. **Output**: Returns final composite as PNG buffer

### Template System

Templates consist of **two files** in the `templates/` directory:

1. **SVG file** (e.g., `futebol.svg`): Visual template with `{{PLACEHOLDER}}` variables
2. **JSON config file** (e.g., `futebol.json`): Metadata defining logo positions, sizes, and defaults

#### Template Config Structure

```json
{
  "name": "futebol",
  "description": "Football/Soccer match template with team colors and logos",
  "canvas": {
    "width": 1200,
    "height": 675
  },
  "logos": [
    {
      "name": "logo1",
      "top": 220,
      "left": 150,
      "width": 300,
      "height": 300
    },
    {
      "name": "logo2",
      "top": 220,
      "left": 750,
      "width": 300,
      "height": 300
    }
  ],
  "defaultVariables": {
    "TITULO": "PARTIDA DE FUTEBOL",
    "DATA": "DATA",
    "HORA": "HORA",
    "ESTADIO": "ESTÁDIO",
    "TIME1_COR1": "#0A0F2D",
    "TIME1_COR2": "#1A4870",
    "TIME2_COR1": "#8B0000",
    "TIME2_COR2": "#DC143C"
  }
}
```

**Config fields:**
- `canvas`: SVG dimensions (informational, not enforced)
- `logos`: Array of logo slots with positioning and sizing
  - `name`: Parameter name in request body
  - `top`, `left`: Composite position in pixels
  - `width`, `height`: Target resize dimensions
- `defaultVariables`: Fallback values for template placeholders

#### Creating New Templates

1. Design SVG file with `{{PLACEHOLDER}}` variables for dynamic content
2. Create companion JSON config file with same base name
3. Define logo positions matching the SVG layout
4. Specify default values for all placeholder variables
5. Place both files in `templates/` directory

## Key Dependencies

- **express**: Web server framework (v5)
- **sharp**: High-performance image processing library for resizing and compositing
- **node-fetch**: HTTP client for downloading remote images (v3, ESM)

## Code Structure

This is a single-file application (`server.js`):
- ES modules enabled via `"type": "module"` in package.json
- Uses async/await for image processing operations
- Environment configuration via `TEMPLATES_DIR` and `PORT` variables (server.js:11-12)
- `loadTemplateConfig()`: Loads and parses JSON config files (server.js:15-24)
- `loadLogoSource()`: Detects and processes logo sources (URL or data URI) (server.js:27-39)
- `loadAndResizeLogo()`: Resizes logos using Sharp (server.js:42-48)
- Main POST `/generate` endpoint: Config-driven composition with dynamic variable replacement (server.js:50-124)
- Health check GET `/health` endpoint: Returns service status (server.js:127-129)
- Font rendering uses SVG text elements embedded in templates

## Important Notes

- **Template-driven design**: Each template requires both an SVG file and a JSON config file
- **Dynamic variable system**: Any parameter in the request body can replace `{{KEY}}` placeholders in the SVG
- **Logo flexibility**: Supports both remote URLs and base64 data URIs for logo sources
- **Config-driven positioning**: Logo positions, sizes, and counts are defined per-template in JSON config
- **Aspect ratio**: Logos are force-resized to dimensions specified in config (may distort if aspect ratio doesn't match)
- **No validation**: Missing template configs return 404, but invalid variables are silently ignored
- **No authentication or rate limiting**: Service is completely open
- **Error handling**: Returns 500 status with generic message on failures

## Docker Configuration

### Multi-Stage Build

The Dockerfile uses a multi-stage build to optimize image size:
- **Stage 1 (builder)**: Installs all dependencies including build tools for Sharp's native modules
- **Stage 2 (production)**: Creates minimal runtime image with only production dependencies

### Image Details

- **Base image**: Node 20 Alpine (lightweight Linux distribution)
- **Working directory**: `/app`
- **Exposed port**: 3000 (configurable via `PORT` env var)
- **User**: Non-root `nodejs` user for security
- **Health check**: Configured to poll `/health` endpoint every 30 seconds

### Volume Mounts

The `docker-compose.yml` mounts the local `templates/` directory as a read-only volume:
```yaml
volumes:
  - ./templates:/app/templates:ro
```

This allows updating templates without rebuilding the Docker image. To use different templates:
1. Modify files in the local `templates/` directory
2. Restart the container: `docker-compose restart`

### Customization

To use a different templates directory:
```bash
# Option 1: Modify docker-compose.yml
volumes:
  - /path/to/custom/templates:/app/templates:ro

# Option 2: Override via docker run
docker run -v /path/to/custom/templates:/app/templates:ro sharp-image-service
```
