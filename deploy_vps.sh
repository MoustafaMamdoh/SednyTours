#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Sydney Tours - Automated VPS Setup Script
#  Run this script on your Hostinger VPS to deploy everything
# ═══════════════════════════════════════════════════════════════

set -e

echo "╔══════════════════════════════════════════════════╗"
echo "║   🚀 Sydney Tours - VPS Deployment Script       ║"
echo "╚══════════════════════════════════════════════════╝"

# ─── CONFIGURATION (EDIT THESE!) ─────────────────────────────
DB_NAME="sydney_tours"
DB_USER="sydney_admin"
DB_PASS="SydneyTours2026" # Avoid @ or special chars unless URL encoded
DOMAIN="_"  # Replace with your domain, e.g. sydneytours.com. Use "_" for IP-only access.
APP_DIR="/var/www/sydneytours"
REPO_URL="https://github.com/MoustafaMamdoh/SednyTours.git"
# ─────────────────────────────────────────────────────────────

echo ""
echo "📦 Step 1: Updating system packages..."
apt update && apt upgrade -y

echo ""
echo "📦 Step 2: Installing required software..."
apt install -y python3 python3-pip python3-venv git nginx mysql-server curl

echo ""
echo "📦 Step 3: Setting up MySQL database..."
# Start MySQL
systemctl start mysql
systemctl enable mysql

# Create database and user
mysql -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"
echo "   ✅ MySQL database '${DB_NAME}' created successfully!"

echo ""
echo "📦 Step 4: Cloning the project from GitHub..."
rm -rf ${APP_DIR}
git clone ${REPO_URL} ${APP_DIR}

echo ""
echo "📦 Step 5: Setting up Python virtual environment..."
cd ${APP_DIR}/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "📦 Step 6: Creating environment file..."
cat > ${APP_DIR}/backend/.env << EOF
DATABASE_URL=mysql+pymysql://${DB_USER}:${DB_PASS}@localhost/${DB_NAME}
EOF

echo ""
echo "📦 Step 7: Building the frontend..."
cd ${APP_DIR}
# Install Node.js if not present
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
npm install
npm run build

echo ""
echo "📦 Step 8: Creating systemd service (auto-start on boot)..."
cat > /etc/systemd/system/sydneytours.service << EOF
[Unit]
Description=Sydney Tours FastAPI Application
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}/backend
Environment="DATABASE_URL=mysql+pymysql://${DB_USER}:${DB_PASS}@localhost/${DB_NAME}"
ExecStart=${APP_DIR}/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable sydneytours
systemctl start sydneytours
echo "   ✅ Application service created and started!"

echo ""
echo "📦 Step 9: Configuring Nginx reverse proxy..."
cat > /etc/nginx/sites-available/sydneytours << EOF
server {
    listen 80;
    server_name ${DOMAIN};

    # Frontend (React)
    root ${APP_DIR}/dist;
    index index.html;

    # API requests → FastAPI backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 50M;
    }

    # React SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/sydneytours /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t && systemctl restart nginx
echo "   ✅ Nginx configured successfully!"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   ✅ DEPLOYMENT COMPLETE!                       ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║                                                  ║"
echo "║   🌐 Open your browser and go to:               ║"
echo "║      http://YOUR_VPS_IP                          ║"
echo "║                                                  ║"
echo "║   👤 Login:                                      ║"
echo "║      Username: admin                             ║"
echo "║      Password: admin                             ║"
echo "║                                                  ║"
echo "║   ⚠️  CHANGE THE PASSWORD AFTER FIRST LOGIN!    ║"
echo "║                                                  ║"
echo "╚══════════════════════════════════════════════════╝"
