# Use official Node.js image
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies based on package-lock.json
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port the app runs on
EXPOSE 8080

# Set environment to production
ENV NODE_ENV production

# Start the application using the custom server
CMD ["npm", "start"]
