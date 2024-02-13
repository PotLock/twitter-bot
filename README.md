# twitter-bot Potlock

Twitter Bot that publishes new registrations on Potlock and Direct Donations

# Requirements

- Create bot called potlock_bot
- Index registry.potlock.near, posts on twitter if project gets flagged with reasoning. Link to project profile page on bos app or nearblocks transactions
- Index donate.potlock.near, mention any referral fees and which account with amount and currency Link to project profile page on bos app or nearblocks transactions. Tag project and donor
  - Twitter Bio reposting @potlock\_ using. Repo here https://github.com/PotLock/twitter-bot

# Bonus

- post on near.social
- if on social.near contract has twitter @the name and @the project (we have reference implementation on our bos app)
- future reference quadratic funding rounds and donations and sponsorships their

# Resources

- https://twitter.com/near_social_bot

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
