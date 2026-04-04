#!/bin/bash
echo "=== OPSIS DALMATIA VPS SETUP ==="

# 1. Install Node.js 20 via nvm
echo ">>> Instaliranje Node.js 20..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
nvm alias default 20

echo "Node: $(node --version)"
echo "npm: $(npm --version)"

# 2. Set Node memory
export NODE_OPTIONS="--max-old-space-size=4096"
echo 'export NODE_OPTIONS="--max-old-space-size=4096"' >> ~/.bashrc
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"' >> ~/.bashrc

# 3. Install ruflo
echo ">>> Instaliranje ruflo..."
npm install -g ruflo@latest

# 4. Clone repo
echo ">>> Kloniranje repoa..."
git clone https://github.com/tutafranko-web/automatska-firma-.git /root/opsis
cd /root/opsis

# 5. Init ruflo
echo ">>> Inicijalizacija ruflo..."
npx ruflo@latest init --force

# 6. Init memory
echo ">>> Inicijalizacija memorije..."
npx ruflo@latest memory init --force

# 7. Store company profile
echo ">>> Spremanje profila firme..."
npx ruflo@latest memory store --key "company-profile" --value "Opsis Dalmatia, AI Digital Agency, Split. Usluge: Voice Agent, Chatbot, Automatizacija, Web, SEO, Content. Industrije: Hoteli, Apartmani, Turisticke agencije, Restorani, E-commerce, Zdravstvo." --namespace marketing

# 8. Init swarm
echo ">>> Pokretanje swarma..."
npx ruflo@latest swarm init --topology hierarchical-mesh --max-agents 12 --strategy specialized

# 9. Init hive-mind
echo ">>> Pokretanje hive-mind..."
npx ruflo@latest hive-mind init --queen-type strategic

# 10. Start daemon
echo ">>> Pokretanje daemona..."
npx ruflo@latest daemon start

# 11. Spawn marketing team
echo ">>> Pokretanje marketing tima..."
npx ruflo@latest hive-mind spawn "Pokreni marketing za Opsis Dalmatia" --queen-type tactical --max-workers 7 --consensus weighted

echo ""
echo "========================================="
echo "  OPSIS DALMATIA MARKETING = AKTIVAN"
echo "  Server: $(hostname -I | awk '{print $1}')"
echo "  Node: $(node --version)"
echo "  Ruflo: $(ruflo --version 2>/dev/null || echo 'installed')"
echo "========================================="
