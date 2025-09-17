sudo tee /usr/local/bin/update-bww2abc >/dev/null <<'EOF'
#!/bin/bash
set -e

APP_DIR="/var/www/bww2abcServer"

echo ">>> Passage dans $APP_DIR"
cd "$APP_DIR"

echo ">>> Récupération des dernières modifications Git..."
git pull --rebase

echo ">>> Mise à jour des dépendances npm..."
npm install --production

echo ">>> Redémarrage du service systemd bww2abc..."
sudo systemctl restart bww2abc

echo ">>> Vérification du statut..."
sudo systemctl status bww2abc --no-pager
EOF

# Rendre exécutable
sudo chmod +x /usr/local/bin/update-bww2abc
