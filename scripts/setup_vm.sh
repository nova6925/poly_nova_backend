#!/bin/bash

# Update and Upgrade
echo "Updating system..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
echo "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v

# Install PM2 (Process Manager)
echo "Installing PM2..."
sudo npm install -g pm2
sudo pm2 startup systemd

# Install PostgreSQL
echo "Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Setup Database User and DB
echo "Configuring Database..."
sudo -u postgres psql -c "CREATE USER polymarket WITH PASSWORD 'securepassword123';"
sudo -u postgres psql -c "CREATE DATABASE polymarket OWNER polymarket;"
sudo -u postgres psql -c "ALTER USER polymarket WITH SUPERUSER;"

# Install Nginx
echo "Installing Nginx..."
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Configure Nginx Reverse Proxy
echo "Configuring Nginx..."
sudo bash -c 'cat > /etc/nginx/sites-available/default <<EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF'

sudo nginx -t
sudo systemctl restart nginx

# Allow Firewall Ports (Oracle Cloud specific iptables)
echo "Opening firewall ports..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo netfilter-persistent save

echo "--------------------------------------------------"
echo "Setup Complete! "
echo "1. Clone your repo: git clone https://github.com/YOUR_USERNAME/poly_nova_backend.git"
echo "2. Setup .env file"
echo "3. Run: npm install && npm run build && pm2 start dist/server.js"
echo "--------------------------------------------------"
