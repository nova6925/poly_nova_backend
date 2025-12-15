# Oracle Cloud (Always Free) Setup Guide

This guide will help you set up your `poly_nova_backend` on an Oracle Cloud "Always Free" VM.

## 1. Create the Instance
1.  Log in to **Oracle Cloud Console**.
2.  Go to **Compute** -> **Instances**.
3.  Click **Create Instance**.
4.  **Name**: `polymarket-server`
5.  **Image & Shape**:
    *   **Image**: Canonical Ubuntu 22.04 (or 24.04).
    *   **Shape**: `VM.Standard.A1.Flex` (ARM) -> **Select 4 OCPUs and 24GB RAM** (This is the powerful free tier).
    *   *Note: If ARM is out of stock, use `VM.Standard.E2.1.Micro` (AMD), but it's much slower.*
6.  **Networking**:
    *   Create new VCN (Virtual Cloud Network).
    *   Assign a public IPv4 address.
7.  **SSH Keys**:
    *   **Save Private Key**: Download this file (`ssh-key-2025...key`). You NEED this to login.
8.  Click **Create**.

## 2. Open Ports (Security List)
By default, Oracle blocks HTTP/HTTPS. We need to open ports 80 (HTTP), 443 (HTTPS), and 3000 (Backend).

1.  Click on your new instance name.
2.  Click on the **Subnet** link (e.g., `subnet-2025...`).
3.  Click on the **Security List** (e.g., `Default Security List...`).
4.  Click **Add Ingress Rules**:
    *   **Source CIDR**: `0.0.0.0/0`
    *   **Destination Port Range**: `80,443,3000`
    *   **Protocol**: TCP
5.  Click **Add Ingress Rules**.

## 3. Connect to Server
Open your terminal (Git Bash or PowerShell) and run:
*(Replace `path/to/key` with your downloaded key and `IP_ADDRESS` with the Public IP from the Oracle console)*

```bash
ssh -i /path/to/your-key.key ubuntu@YOUR_SERVER_IP
```

## 4. Run the Setup Script
I have created a script `setup_vm.sh` in your repo. Once logged in, you will copy-paste it to install everything.

### Copy script to server (Run this LOCALLY):
```bash
scp -i /path/to/your-key.key poly_nova_backend/scripts/setup_vm.sh ubuntu@YOUR_SERVER_IP:~/setup_vm.sh
```

### Run script (Run this ON SERVER):
```bash
chmod +x setup_vm.sh
./setup_vm.sh
```

This script will installs:
*   Node.js 20
*   PostgreSQL
*   PM2 (Process Manager)
*   Nginx (Web Server)
*   Git

## 5. Clone and Configure
(After script finishes)

1.  **Clone Repo**:
    ```bash
    git clone https://github.com/YOUR_USERNAME/poly_nova_backend.git
    cd poly_nova_backend
    ```

2.  **Setup Env**:
    ```bash
    cp .env.example .env
    nano .env
    # Edit DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/polymarket?schema=public"
    # Edit YOUTUBE_API_KEY etc.
    # Press Ctrl+O (Enter) then Ctrl+X to save
    ```

3.  **Start App**:
    ```bash
    npm install
    npx prisma db push  # Setup DB
    npm run build
    pm2 start dist/server.js --name "backend"
    pm2 save
    ```

Your backend will now be live at `http://YOUR_SERVER_IP:3000`!
