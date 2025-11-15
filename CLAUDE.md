# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Node.js Express service that generates dynamic images by compositing logos and text onto SVG templates using the Sharp library. The service fetches remote images, resizes them, and overlays them on template backgrounds with custom text.

## Running the Service

Start the server:
```bash
node server.js
```

The API runs on port 3000.

## Architecture

### Single Endpoint Design

The service exposes one POST endpoint `/generate` that handles all image generation:

**Request body:**
- `template`: Filename of the SVG template (from `templates/` directory)
- `logo1`: URL of first logo image to fetch and composite
- `logo2`: URL of second logo image to fetch and composite
- `data`: Text string to overlay (date field)
- `hora`: Text string to overlay (time field)

**Response:** PNG image buffer with Content-Type: image/png

### Image Processing Pipeline

1. **Template Loading**: Reads SVG template from `templates/` directory
2. **Logo Fetching**: Downloads remote images via node-fetch
3. **Logo Processing**: Uses Sharp to resize logos to 300x300px PNG
4. **Composition**: Sharp composites logos and SVG text overlays onto base template:
   - Logo positions are hardcoded (logo1 at top:300 left:200, logo2 at top:300 left:950)
   - Text overlays use inline SVG buffers with white Arial text
   - Date text positioned at x:450 y:150, time at x:1000 y:150
5. **Output**: Returns final composite as PNG buffer

### Template System

Templates are SVG files in the `templates/` directory. Currently contains `futebol.svg` which provides:
- 1200x675px canvas with gradient background
- Pre-positioned placeholder boxes for logos (300x300px)
- Title bar and footer with semi-transparent overlays
- The template defines the visual structure; logos and text are composited on top

## Key Dependencies

- **express**: Web server framework (v5)
- **sharp**: High-performance image processing library for resizing and compositing
- **node-fetch**: HTTP client for downloading remote images (v3, ESM)

## Code Structure

This is a single-file application (`server.js`):
- ES modules enabled via `"type": "module"` in package.json
- Uses async/await for image processing operations
- Hardcoded positioning values are in the composite array (server.js:41-73)
- Font rendering uses SVG text elements, not embedded fonts

## Important Notes

- Logos are force-resized to 300x300px regardless of aspect ratio
- All coordinates and sizes are hardcoded for the current template dimensions
- No authentication or rate limiting implemented
- Text is rendered as SVG overlays, not rasterized fonts
- Error handling returns 500 status with generic message
