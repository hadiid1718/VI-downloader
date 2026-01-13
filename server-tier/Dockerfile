# Node.js runtime
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies (yt-dlp requires python and curl)
RUN apk add --no-cache python3 py3-pip curl ffmpeg

# Install yt-dlp
RUN pip3 install --no-cache-dir yt-dlp

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create downloads directory
RUN mkdir -p downloads

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start application
CMD ["npm", "start"]
