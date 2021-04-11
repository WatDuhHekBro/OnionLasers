# Table of Contents

- [Version Numbers](#version-numbers)
- [Message Subcommand Type](#message-subcommand-type)
- [Command Menu](#command-menu)
- [Command Metadata](#command-metadata)
- [Command Var String](#command-var-string)
- [Utility Functions](#utility-functions)

# Version Numbers

When a new version is ready to be declared...
- ...update the [changelog](../CHANGELOG.md).
- ...update the version numbers in [package.json](../package.json) and [package-lock.json](../package-lock.json).

# Message Subcommand Type

- `https://discord.com/channels/<id>/<id>/<id>` comes from the `Copy Message Link` button.
- `<id>-<id>` comes from holding `Shift` on the desktop application and clicking on the `Copy ID` button.

# Command Menu

- `args`: A list of arguments in the command. It's relative to the subcommand, so if you do `$test this 5`, `5` becomes `$.args[0]` if `this` is a subcommand. Args are already converted, so a `number` subcommand would return a number rather than a string.
- `client`: `message.client`
- `message`: `message`
- `channel`: `message.channel`
- `guild`: `message.guild`
- `author`: `message.author`
- `member`: `message.member`

# Command Metadata

- `description`: The command description that'll appear in the help menu.
- `endpoint`: Whether or not any arguments are allowed after the command.
- `usage`: Defines a custom usage when showing the command in the help menu.
- `permission`: *(Inherits)* -1 (default) indicates to inherit, 0 is the lowest rank, 1 is second lowest rank, and so on.
- `nsfw`: *(Inherits)* Whether or not the command is restricted to NSFW channels and DM channels.
- `channelType`: *(Inherits)* Whether the command is restricted to guild channels, DM channels, or has no restriction. Uses the `CHANNEL_TYPE` enum provided by the command handler.

# Command Var String

- `%author%` - A user mention of the person who called the command.
- `%prefix%` - The prefix of the current guild.
- `%command%` - The command's execution path up to the current subcommand.

# Utility Functions

## [src/core (libd)](../src/core/libd.ts) - Utility functions specific for working with Discord

`paginate()`
```ts
const pages = ["one", "two", "three"];

paginate(send, author.id, pages.length, page => {
	return {content: pages[page]};
});
```

`poll()`
```ts
const results = await poll(await send("Do you agree with this decision?"), ["✅", "❌"]);
results["✅"]; // number
results["❌"]; // number
```

`confirm()`
```ts
const result = await confirm(await send("Are you sure you want to delete this?"), author.id); // boolean | null
```

`askMultipleChoice()`
```ts
const result = await askMultipleChoice(await send("Which of the following numbers is your favorite?"), author.id, 4, 10000); // number (0 to 3) | null
```

`askForReply()`
```ts
const reply = await askForReply(await send("What is your favorite thing to do?"), author.id, 10000); // Message | null
```
