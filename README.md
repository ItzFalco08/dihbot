# DihBot
A Discord bot with a gambling system and fun commands. Made by ItzFalco08 (Discord: rupamdas01).

## Invite the bot
Use this link to add the bot to your server:

https://discord.com/oauth2/authorize?client_id=1495091916168102149&permissions=8&integration_type=0&scope=bot

## Run locally
### Requirements
- Node.js (LTS recommended)
- A Discord bot token
- A PostgreSQL connection URI (Neon or any compatible provider)

### Setup
1. Create a `.env` file with the following keys:
	- `DISCORD_TOKEN`
	- `POSTGRESQL_NEON_BACKEND`
2. Install dependencies:
	- `npm i`
3. Start the bot:
	- `node main.js`

## Commands
Send these in any channel where the bot can read messages.

- `ping` - Health check; replies with `pong (dihbot NodeJS)`.
- `dih joke` - Sends a random dark joke.
- `dih cash` - Shows your current dih balance.
- `dih daily` - Claim 1000 dihs once every 24 hours.
- `dih flip <amount>` - 50/50 coin flip to win or lose the amount.
- `dih give @user <amount>` - Transfer dihs to another user.

## License
MIT License. See the LICENSE file for details.
