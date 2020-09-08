# CrossExchange
Yet another Discord bot. This time, a CrossCode-themed stock market.

# Getting Started
1. `npm install`
2. `npm run build`
3. `npm start`

# Getting Started (Developers)
1. `npm install`
2. `npm run dev`
3. Familiarize yourself with the [project's structure](docs/Documentation.md).
4. Make sure to avoid using `npm run build`! This will remove all your dev dependencies (in order to reduce space used). Instead, use `npm run once` to compile and build in non-dev mode.
5. Begin developing.

## Don't forget to...
- ...update the [changelog](docs/CHANGELOG.md) and any other necessary docs.
- ...update the version numbers in `package.json` and `package-lock.json`.
- ...make sure the test suite passes by running `npm test`.

# User Guide
This isn't a comprehensive guide to all the commands as that's already embedded in the `help` command.
- To begin the stonks and initialize its news into a server, you have to dedicate a channel to it. This will be the channel the bot updates whenever stuff changes. `$admin init` which can be used by server admins and the bot's mechanics.
- You can get credits every 22 hours by doing `$money get`. Then do `$stonks` to buy and sell le stonks.
- If a market's value reaches 0, all of the stocks invested into that market will be forfeited.