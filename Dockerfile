FROM node:18

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Set environment variables from .env file
ARG OPENROUTER_API_KEY
ARG TOKEN
ARG CLIENT_ID
ARG GUILD_ID

ENV OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
ENV TOKEN=${TOKEN}
ENV CLIENT_ID=${CLIENT_ID}
ENV GUILD_ID=${GUILD_ID}

# Start the bot
CMD ["node", "index.js"]