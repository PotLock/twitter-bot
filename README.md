# How to run

```bash
# Install bun
curl -fsSL https://bun.sh/install | bash # for macOS, Linux, and WSL

bun install

# dev, simulates tweets to console
bun run dev

# Create .env.local and get oauth-1.0a credentials from twitter developer portal
cp .env.example .env.local

# prod, sends tweets to bot
bun run build
bun run start

```
