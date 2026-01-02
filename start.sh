#!/bin/zsh
# Script pour démarrer tous les services Docker et l'application locale

set -e

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
  echo "Docker n'est pas installé. Veuillez l'installer avant de continuer."
  exit 1
fi

# Démarrer tous les containers Docker
echo "Démarrage des containers Docker..."
docker compose up -d

# Attendre quelques secondes pour que les services démarrent
sleep 5

echo "Containers Docker démarrés."

# Lancer les applications locales (API, admin, web, etc.)
# Utilise Nx pour démarrer tous les projets si Nx est utilisé
if [ -f "nx.json" ]; then
  echo "Démarrage des applications Nx..."
  npx nx run-many --target=serve --all
else
  echo "Veuillez démarrer manuellement vos applications locales."
fi

echo "Tout est lancé !"
