# Auto-héberger n8n chez un hébergeur (VPS)

Tu loues un petit serveur (VPS) chez un hébergeur, tu y installes n8n avec Docker. Le serveur tourne 24/7, tes workflows et webhooks fonctionnent en continu.

---

## 1. Choisir un hébergeur (VPS)

| Hébergeur        | Prix indicatif | Avantage                    |
|------------------|----------------|-----------------------------|
| **Hetzner**      | ~4–5 €/mois    | Bon rapport qualité/prix, EU |
| **Scaleway**     | ~5 €/mois      | Français, simple            |
| **OVH**          | ~4 €/mois      | Français, connu             |
| **DigitalOcean** | ~6 $/mois      | Très utilisé, doc en anglais |
| **Contabo**      | ~5 €/mois      | Beaucoup de RAM pour le prix |

Pour n8n seul, un **petit VPS** suffit : 1 vCPU, 1–2 Go RAM, 20–40 Go disque (ex. “CX11” chez Hetzner, “Starter” chez Scaleway).

---

## 2. Créer le serveur

1. Inscris-toi sur le site de l’hébergeur.
2. Crée une instance **VPS** (souvent nommée “Cloud server”, “Droplet”, “Instance”).
3. Choisis :
   - **OS** : Ubuntu 22.04 LTS (recommandé).
   - **Région** : la plus proche de toi ou de tes utilisateurs.
4. Note l’**adresse IP** du serveur et connecte-toi en **SSH** :
   ```bash
   ssh root@TON_IP
   ```
   (ou avec un utilisateur fourni par l’hébergeur ; le mot de passe ou la clé SSH est indiquée à la création.)

---

## 3. Installer Docker sur le serveur

Une fois connecté en SSH :

```bash
# Mise à jour
apt update && apt upgrade -y

# Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
```

---

## 4. Installer n8n avec Docker Compose

```bash
mkdir -p ~/n8n
cd ~/n8n
nano docker-compose.yml
```

Colle ce contenu (adapte les valeurs entre `<...>`) :

```yaml
version: '3'
services:
  n8n:
    image: n8nio/n8n:latest
    restart: unless-stopped
    ports:
      - "80:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=<CHOISIS_UN_MOT_DE_PASSE_FORT>
      - N8N_HOST=<TON_IP_OU_DOMAINE>
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://<TON_IP_OU_DOMAINE>/
    volumes:
      - n8n_data:/home/node/.n8n
volumes:
  n8n_data: {}
```

Remplace :
- `<CHOISIS_UN_MOT_DE_PASSE_FORT>` : mot de passe pour te connecter à l’interface n8n.
- `<TON_IP_OU_DOMAINE>` : l’IP du VPS (ex. `51.83.42.123`) ou un domaine si tu en as un (ex. `n8n.ton-domaine.com`).

Sauvegarde (Ctrl+O, Entrée, Ctrl+X), puis :

```bash
docker compose up -d
```

n8n est accessible sur **http://TON_IP** (port 80). Connexion avec le user/mot de passe définis.

---

## 5. Mettre à jour l’URL du webhook dans ton app

Dans ton projet Next.js (`.env.local`), remplace l’URL n8n Cloud par l’URL de ton n8n auto-hébergé :

- Avant (exemple) : `N8N_WEBHOOK_URL=https://georgesdoxuan.app.n8n.cloud/webhook/...`
- Après : `N8N_WEBHOOK_URL=http://TON_IP/webhook/ID_DU_WEBHOOK`

Tu recrées un workflow avec un nœud Webhook dans n8n sur ton serveur, tu récupères la nouvelle URL du webhook et tu la mets dans `N8N_WEBHOOK_URL` (et `N8N_WEBHOOK_URL_LOCAL_BUSINESSES` si tu l’utilises).

---

## 6. (Optionnel) HTTPS avec un domaine

Si tu as un **nom de domaine** (ex. acheté chez OVH, Gandi, Cloudflare) :

1. Crée un enregistrement **A** pointant vers l’IP du VPS (ex. `n8n.ton-domaine.com` → IP).
2. Sur le serveur, installe **Caddy** (reverse proxy + certificat SSL gratuit) :
   ```bash
   apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
   curl -1sL 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sL 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
   apt update && apt install caddy -y
   ```
3. Configure Caddy pour `n8n.ton-domaine.com` qui proxy vers `localhost:5678`, et dans `docker-compose` pour n8n mets `N8N_PORT=5678`, `N8N_PROTOCOL=https`, `N8N_HOST=n8n.ton-domaine.com`, `WEBHOOK_URL=https://n8n.ton-domaine.com/`.
4. Expose uniquement les ports 80 et 443 sur le VPS (plus le port 5678 en interne uniquement).

Comme ça ton n8n est en **https** et ton `WEBHOOK_URL` / `N8N_WEBHOOK_URL` peuvent être en `https://n8n.ton-domaine.com/...`.

---

## 7. Sauvegarder tes workflows

Les données n8n sont dans le volume Docker `n8n_data`. Pour sauvegarder :

```bash
cd ~/n8n
docker run --rm -v n8n_n8n_data:/data -v $(pwd):/backup alpine tar czf /backup/n8n-backup-$(date +%Y%m%d).tar.gz -C /data .
```

Tu peux copier `n8n-backup-*.tar.gz` sur ton PC régulièrement.

---

## Résumé

1. Prendre un VPS (Hetzner, Scaleway, OVH, etc.).
2. SSH → installer Docker → créer `docker-compose.yml` avec n8n.
3. `docker compose up -d` → accéder à n8n via l’IP (ou le domaine).
4. Mettre à jour `N8N_WEBHOOK_URL` dans ton app pour pointer vers ce n8n.
5. (Optionnel) Domaine + Caddy pour HTTPS.

Si tu me dis l’hébergeur que tu choisis (Hetzner, Scaleway, OVH…), je peux t’indiquer les clics exacts pour créer le VPS sur leur interface.
