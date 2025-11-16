# Sharp Image Service

Node.js service for dynamic image generation through composition of logos and text on configurable SVG templates.

## Features

- **Generic Template System**: SVG templates with dynamic placeholders and JSON configuration
- **Image Composition**: Automatically processes and positions logos using Sharp
- **Flexible Remote Sources**: Supports HTTP/HTTPS URLs and Data URIs (base64)
- **Simple REST API**: Single endpoint for generating all variations
- **Production Ready**: Docker multi-stage build and CI/CD with GitHub Actions
- **High Performance**: Optimized image processing with Sharp

## Installation

### Requirements

- Node.js 20 or higher
- npm or yarn

### Local Setup

```bash
# Clone the repository
git clone https://github.com/sigrist/sharp-image-service.git
cd sharp-image-service

# Install dependencies
npm install

# Start the server
npm start
```

The server will be available at `http://localhost:3000`

### Environment Variables

- `PORT`: HTTP server port (default: `3000`)
- `TEMPLATES_DIR`: Templates directory (default: `./templates`)

```bash
PORT=8080 TEMPLATES_DIR=./my-templates npm start
```

## Quick Start

### Generate Image (Binary Response)

```bash
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "template": "futebol.svg",
    "logo1": "https://example.com/team1.png",
    "logo2": "https://example.com/team2.png",
    "titulo": "CHAMPIONSHIP FINAL",
    "data": "NOV 15, 2025",
    "hora": "4:00 PM"
  }' \
  --output result.png
```

### Generate Image (Base64 Response)

```bash
curl -X POST "http://localhost:3000/generate?format=base64" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "futebol.svg",
    "logo1": "https://example.com/team1.png",
    "logo2": "https://example.com/team2.png"
  }'
```

Returns a Data URI that can be used directly in HTML:
```html
<img src="data:image/png;base64,iVBORw0KGgo..." alt="Generated Image">
```

## API Endpoints

### POST /generate

Main endpoint for image generation.

**Query Parameters:**
- `format` (optional): Output format
  - Omit or empty: Returns binary PNG (`image/png`)
  - `base64`: Returns Data URI string (`text/plain`)

**Request Body (JSON):**

```json
{
  "template": "template-name.svg",
  "logo1": "https://logo-url.png",
  "logo2": "data:image/png;base64,iVBORw0...",
  "titulo": "DYNAMIC TEXT",
  "any_variable": "value"
}
```

**Parameters:**
- `template` (required): SVG template filename (e.g., `futebol.svg`)
- **Logos**: Named parameters according to the template's config file
  - Accepted values: HTTP/HTTPS URLs or base64 Data URIs
- **Variables**: Any other parameter replaces `{{KEY}}` placeholders in the SVG
  - Keys are automatically converted to uppercase
  - Unused parameters are ignored
  - Default values are applied from the template configuration

**Response:**
- **Default**: PNG buffer with `Content-Type: image/png`
- **With `?format=base64`**: Data URI string with `Content-Type: text/plain`

### GET /health

Health check endpoint for monitoring.

**Response:**
```json
{"status": "ok"}
```

## Template System

Each template consists of **two files** in the `templates/` directory:

### 1. SVG File (e.g., `futebol.svg`)

Visual template with placeholders in `{{VARIABLE}}` format:

```xml
<svg width="1200" height="675">
  <text>{{TITULO}}</text>
  <text>{{DATA}}</text>
  <rect fill="{{TIME1_COR1}}" />
</svg>
```

### 2. JSON Configuration File (e.g., `futebol.json`)

Metadata defining logo positioning, dimensions, and default values:

```json
{
  "name": "futebol",
  "description": "Template for football matches",
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
    "TITULO": "FOOTBALL MATCH",
    "DATA": "DATE",
    "HORA": "TIME",
    "TIME1_COR1": "#0A0F2D",
    "TIME2_COR1": "#8B0000"
  }
}
```

### Creating a New Template

1. Create an SVG file with `{{VARIABLE}}` placeholders
2. Create a JSON file with the same base name
3. Define logo positions in the JSON
4. Specify default values for all variables
5. Place both files in `templates/`

## Docker

### Using GitHub Container Registry Image (Recommended)

```bash
# With Docker Compose
docker-compose up -d

# With Docker CLI
docker pull ghcr.io/sigrist/sharp-image-service:latest
docker run -d \
  --name sharp-image-service \
  -p 3000:3000 \
  -v $(pwd)/templates:/app/templates:ro \
  ghcr.io/sigrist/sharp-image-service:latest
```

### Local Build

```bash
# With Docker Compose (development)
docker-compose -f docker-compose.dev.yml up -d --build

# With Docker CLI
docker build -t sharp-image-service .
docker run -d -p 3000:3000 sharp-image-service
```

### Available Tags

- `latest`: Latest version from main branch
- `vX.Y.Z`: Specific version (e.g., `v1.0.0`)
- `vX.Y`: Minor version (e.g., `v1.0`)
- `vX`: Major version (e.g., `v1`)

### Custom Templates

Mount a custom templates directory:

```bash
docker run -d \
  -p 3000:3000 \
  -v /path/to/templates:/app/templates:ro \
  -e TEMPLATES_DIR=/app/templates \
  ghcr.io/sigrist/sharp-image-service:latest
```

## Processing Pipeline

1. **Configuration Loading**: Reads the template's JSON config file
2. **Template Loading**: Reads the SVG as UTF-8 string
3. **Variable Replacement**: Merges request parameters with defaults and replaces `{{KEY}}` placeholders
4. **Logo Source Detection**:
   - If starts with `data:image/` → decodes base64 Data URI
   - Otherwise → fetches remote image
5. **Logo Processing**: Resizes each logo using Sharp
6. **Composition**: Renders the SVG and composites logos at configured positions
7. **Output**: Returns final PNG (binary or base64)

## Project Structure

```
sharp-image-service/
├── server.js              # Main application (Express server)
├── package.json           # Dependencies and scripts
├── Dockerfile            # Multi-stage build for production
├── docker-compose.yml    # Compose for production (GHCR)
├── docker-compose.dev.yml # Compose for local development
├── .github/
│   └── workflows/
│       └── docker-publish.yml  # CI/CD for image publishing
└── templates/            # Templates directory
    ├── futebol.svg      # SVG template
    └── futebol.json     # Template configuration
```

## Main Dependencies

- **express** (v5): Web framework for Node.js
- **sharp**: High-performance image processing library
- **node-fetch** (v3): HTTP client for downloading remote images

## Usage Examples

### Example 1: Logos via URL

```javascript
const response = await fetch('http://localhost:3000/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    template: 'futebol.svg',
    logo1: 'https://cdn.example.com/team-a.png',
    logo2: 'https://cdn.example.com/team-b.png',
    titulo: 'SEMIFINAL',
    data: 'NOV 20, 2025',
    hora: '8:00 PM',
    estadio: 'STADIUM NAME'
  })
});

const imageBuffer = await response.arrayBuffer();
```

### Example 2: Logo via Data URI

```javascript
const base64Logo = 'data:image/png;base64,iVBORw0KGgoAAAANS...';

const response = await fetch('http://localhost:3000/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    template: 'futebol.svg',
    logo1: base64Logo,
    logo2: 'https://example.com/logo.png',
    titulo: 'FINAL'
  })
});
```

### Example 3: Base64 Response for HTML

```javascript
const response = await fetch('http://localhost:3000/generate?format=base64', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    template: 'futebol.svg',
    logo1: 'https://example.com/logo1.png',
    logo2: 'https://example.com/logo2.png'
  })
});

const dataUri = await response.text();
// Use directly: <img src="${dataUri}" />
```

## CI/CD

The project uses GitHub Actions for automated Docker image build and publishing:

- **Trigger**: Published release or manual execution
- **Registry**: GitHub Container Registry (ghcr.io)
- **Platforms**: linux/amd64, linux/arm64
- **Tags**: Automatically generated from release version

### Creating a New Release

```bash
# Create and push a tag
git tag v1.0.0
git push origin v1.0.0

# On GitHub: Releases → Create a new release
# Select the tag, add release notes, and publish
# The image will be built and published automatically
```

## Important Notes

- **No input validation**: Non-existent templates return 404, but invalid variables are silently ignored
- **No authentication**: The service is completely open
- **No rate limiting**: Consider adding in production
- **Aspect ratio**: Logos are force-resized (may distort if aspect ratio doesn't match)
- **Font rendering**: Uses SVG text elements embedded in templates

## Health Check

The `/health` endpoint can be used for:
- Docker health checks
- Kubernetes liveness/readiness probes
- Load balancer monitoring
- Observability tools

## License

ISC

## Author

[sigrist](https://github.com/sigrist)
