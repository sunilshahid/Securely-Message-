FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose required port 3000 for standard HTTP and Socket traffic
EXPOSE 3000

ENV NODE_ENV=production

# Start production server
CMD ["npm", "start"]
