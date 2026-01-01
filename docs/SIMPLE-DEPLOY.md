# Simple Cloud Deployment (5 Steps)

## On Your Cloud Server:

### 1. Install Docker & Nginx
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Nginx
sudo apt update
sudo apt install nginx
```

### 2. Deploy Frontend Container
```bash
# Build and run frontend
docker build -t checkin-frontend https://github.com/youruser/checkin-frontend.git
docker run -d --name frontend --restart always -p 3001:80 checkin-frontend
```

### 3. Deploy Backend Container
```bash
# Build and run backend (adjust as needed)
docker build -t checkin-backend https://github.com/youruser/checkin-backend.git
docker run -d --name backend --restart always -p 8080:8080 \
  -e DB_HOST=your-db-host \
  -e DB_PASS=your-password \
  checkin-backend
```

### 4. Configure Nginx
```bash
# Create nginx config
sudo nano /etc/nginx/sites-available/checkin
```

Paste this:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable it:
```bash
sudo ln -s /etc/nginx/sites-available/checkin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Add SSL
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Done! 🎉

Your app is now live at `https://your-domain.com`

## Architecture:
```
Internet → Nginx (Port 80/443)
             ├→ / → Frontend Docker (Port 3001)
             └→ /api → Backend Docker (Port 8080)
```

## Useful Commands:
```bash
# View logs
docker logs frontend
docker logs backend

# Restart containers
docker restart frontend
docker restart backend

# Update frontend
docker stop frontend
docker rm frontend
docker build -t checkin-frontend [repo-url]
docker run -d --name frontend --restart always -p 3001:80 checkin-frontend
```