FROM node:20

# Build tools needed for better-sqlite3 (native module)
RUN apt-get update && apt-get install -y python3 make g++ wget && rm -rf /var/lib/apt/lists/*

# Install Litestream
RUN wget -q https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-amd64-static.tar.gz \
    && tar -xzf litestream-v0.3.13-linux-amd64-static.tar.gz \
    && mv litestream /usr/local/bin/ \
    && rm litestream-v0.3.13-linux-amd64-static.tar.gz

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["bash", "start.sh"]
