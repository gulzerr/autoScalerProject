FROM node:20-slim
# Set the working directory
WORKDIR /app
# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
    && rm -rf /var/lib/apt/lists/*
# Copy package.json and package-lock.json
COPY package*.json ./
# Install dependencies
RUN yarn install
# Copy the application code
COPY . .
# Expose the port the app runs on
EXPOSE 3002
# Start the application
CMD ["yarn", "start"]

