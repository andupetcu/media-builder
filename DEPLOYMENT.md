# Media Builder v2 - Deployment Guide

This guide covers deploying Media Builder to a remote server for production use.

## Prerequisites

- **Server Requirements:**
  - Ubuntu 22.04 LTS or similar Linux distribution
  - Node.js 22.x
  - Docker and Docker Compose
  - Minimum 4GB RAM, 2 CPU cores
  - 50GB+ storage for assets and database

- **Domain & SSL:**
  - Domain name pointed to your server
  - SSL certificate (recommended: Let's Encrypt with Certbot)

- **Access:**
  - SSH access to the server
  - Root or sudo privileges

## Server Setup

### 1. Install Node.js 22

```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v22.x.x
```

### 2. Install Docker and Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt-get install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### 3. Install pnpm

```bash
npm install -g pnpm@9.15.4
pnpm --version
```

## Application Deployment

### 1. Clone the Repository

```bash
# Clone your repository
git clone https://git.noru1.ro/andrei/media-builder-v3.git
cd media-builder-v3

# Or if authentication is needed
git clone https://USERNAME:PASSWORD@git.noru1.ro/andrei/media-builder-v3.git
```

### 2. Environment Configuration

Create a production `.env` file:

```bash
cat > .env << 'EOF'
# Node Environment
NODE_ENV=production

# Ports
API_PORT=3001
WS_PORT=8081
WEB_PORT=3000

# Database
DATABASE_URL="postgresql://mediabuilder:CHANGE_THIS_PASSWORD@localhost:5432/mediabuilder?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_THIS_PASSWORD

# JWT Configuration
JWT_SECRET=CHANGE_THIS_TO_RANDOM_STRING_MIN_32_CHARS
JWT_EXPIRES=15m
REFRESH_TOKEN_SECRET=CHANGE_THIS_TO_DIFFERENT_RANDOM_STRING
REFRESH_TOKEN_EXPIRES=7d

# CORS - Update with your domain
CORS_ORIGIN=https://yourdomain.com

# Public URLs - Update with your domain
PUBLIC_BASE_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api

# Polotno Editor Key
NEXT_PUBLIC_POLOTNO_KEY=WtWR19i4P14e_UK7eUUE

# Storage
ASSETS_ROOT=/data/assets
ASSETS_PUBLIC_PATH=/data/assets/public

# Azure OpenAI (Optional - for AI features)
# AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
# AZURE_OPENAI_API_KEY=your-api-key
# AZURE_OPENAI_DEPLOYMENT_TEXT=gpt-4
# AZURE_OPENAI_DEPLOYMENT_IMAGE=dall-e-3
EOF
```

**Important:** Change all passwords and secrets!

### 3. Generate Secure Secrets

```bash
# Generate JWT secrets
openssl rand -base64 32

# Generate Redis password
openssl rand -base64 24

# Generate database password
openssl rand -base64 24
```

Update the `.env` file with these generated values.

### 4. Create Docker Compose for Production

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: mb_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: mediabuilder
      POSTGRES_USER: mediabuilder
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mediabuilder"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: mb_redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "127.0.0.1:6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

### 5. Start Database Services

```bash
# Extract passwords from .env for docker-compose
export DATABASE_PASSWORD=$(grep 'postgresql://mediabuilder:' .env | sed -n 's/.*:\([^@]*\)@.*/\1/p')
export REDIS_PASSWORD=$(grep 'REDIS_PASSWORD=' .env | cut -d'=' -f2)

# Start services
docker compose -f docker-compose.prod.yml up -d

# Check services are running
docker compose -f docker-compose.prod.yml ps
```

### 6. Create Asset Storage Directory

```bash
# Create storage directory
sudo mkdir -p /data/assets/public /data/assets/private

# Set permissions (assuming your app runs as 'appuser')
sudo chown -R $USER:$USER /data/assets
chmod -R 755 /data/assets
```

### 7. Install Dependencies and Build

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm --filter prisma generate

# Run database migrations
pnpm --filter prisma migrate deploy

# Seed initial data
pnpm --filter prisma seed

# Build all applications
pnpm build
```

### 8. Set Up Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'api',
      script: 'dist/apps/api/main.js',
      cwd: './',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/api-err.log',
      out_file: './logs/api-out.log',
      time: true
    },
    {
      name: 'web',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: './apps/web',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/web-err.log',
      out_file: './logs/web-out.log',
      time: true
    },
    {
      name: 'workers',
      script: 'dist/apps/workers/main.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/workers-err.log',
      out_file: './logs/workers-out.log',
      time: true
    }
  ]
};
EOF

# Create logs directory
mkdir -p logs

# Start applications
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set PM2 to start on system boot
pm2 startup
# Follow the instructions provided by the command above
```

### 9. Configure Nginx Reverse Proxy

Install Nginx:

```bash
sudo apt-get update
sudo apt-get install -y nginx
```

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/mediabuilder
```

Add the following configuration (replace `yourdomain.com`):

```nginx
# Upstream servers
upstream api_backend {
    server 127.0.0.1:3001;
}

upstream web_backend {
    server 127.0.0.1:3000;
}

upstream ws_backend {
    server 127.0.0.1:8081;
}

# HTTP - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com;

    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com;

    # SSL Configuration (update with your certificate paths)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Client max body size (for uploads)
    client_max_body_size 500M;

    # API Backend
    location /api {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket for realtime collaboration
    location /ws {
        proxy_pass http://ws_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # Static assets (served directly by Nginx)
    location /assets {
        alias /data/assets/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Next.js Frontend
    location / {
        proxy_pass http://web_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and restart Nginx:

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/mediabuilder /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 10. Set Up SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

## Monitoring and Maintenance

### PM2 Monitoring

```bash
# View application status
pm2 status

# View logs
pm2 logs

# View specific app logs
pm2 logs api
pm2 logs web
pm2 logs workers

# Restart applications
pm2 restart all
pm2 restart api

# Monitor real-time metrics
pm2 monit
```

### Database Backups

Create a backup script:

```bash
sudo nano /usr/local/bin/backup-mediabuilder.sh
```

Add:

```bash
#!/bin/bash
BACKUP_DIR="/backups/mediabuilder"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker exec mb_postgres pg_dump -U mediabuilder mediabuilder | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup assets
tar -czf $BACKUP_DIR/assets_$DATE.tar.gz /data/assets

# Keep only last 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make it executable and schedule:

```bash
sudo chmod +x /usr/local/bin/backup-mediabuilder.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-mediabuilder.sh
```

### Log Rotation

Create log rotation config:

```bash
sudo nano /etc/logrotate.d/mediabuilder
```

Add:

```
/home/youruser/media-builder-v3/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    copytruncate
}
```

## Updating the Application

To deploy updates:

```bash
# Navigate to project directory
cd ~/media-builder-v3

# Pull latest changes
git pull origin main

# Install new dependencies if any
pnpm install

# Regenerate Prisma client if schema changed
pnpm --filter prisma generate

# Run migrations if database changed
pnpm --filter prisma migrate deploy

# Rebuild applications
pnpm build

# Restart services
pm2 restart all

# Check status
pm2 status
```

## Troubleshooting

### Application won't start

```bash
# Check PM2 logs
pm2 logs --err

# Check if ports are available
sudo netstat -tulpn | grep -E ':(3000|3001|8081)'

# Check environment variables
pm2 env api
```

### Database connection issues

```bash
# Check PostgreSQL is running
docker compose -f docker-compose.prod.yml ps postgres

# Check connection
docker exec mb_postgres psql -U mediabuilder -d mediabuilder -c "SELECT 1"

# View PostgreSQL logs
docker compose -f docker-compose.prod.yml logs postgres
```

### Nginx issues

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### High memory usage

```bash
# Check memory usage
free -h
pm2 monit

# Restart specific service
pm2 restart api --update-env
```

## Security Checklist

- [ ] Change all default passwords in `.env`
- [ ] Configure firewall (ufw or iptables)
- [ ] Set up fail2ban for SSH protection
- [ ] Enable automatic security updates
- [ ] Configure proper file permissions for `/data/assets`
- [ ] Review Nginx security headers
- [ ] Set up monitoring and alerting
- [ ] Regular backup verification
- [ ] Keep Node.js and system packages updated

## Firewall Configuration

```bash
# Install and configure UFW
sudo apt-get install -y ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (IMPORTANT - do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Performance Tuning

### PostgreSQL

Edit `/etc/postgresql/16/main/postgresql.conf` or use Docker volume mount:

```
# Recommended settings for 4GB RAM server
shared_buffers = 1GB
effective_cache_size = 3GB
maintenance_work_mem = 256MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 10MB
min_wal_size = 1GB
max_wal_size = 4GB
```

### Node.js / PM2

Adjust instance count in `ecosystem.config.js` based on CPU cores.

## Support

For issues and questions:
- Check logs: `pm2 logs`
- Review Nginx logs: `/var/log/nginx/`
- Database logs: `docker compose logs postgres`
- Application logs: `./logs/`
