# Onion Lasers Command Handler

<p align="center">
    <a href="https://nodei.co/npm/onion-lasers/">
        <img src="https://nodei.co/npm/onion-lasers.png">
    </a>
</p>
<p align="center">
    <a href="https://choosealicense.com/licenses/mit/">
        <img src="https://img.shields.io/github/license/WatDuhHekBro/OnionLasers" alt="License">
    </a>
    <a href="https://github.com/WatDuhHekBro/OnionLasers/blob/master/CHANGELOG.md">
        <img src="https://img.shields.io/github/package-json/v/WatDuhHekBro/OnionLasers" alt="Version">
    </a>
    <a href="https://discord.js.org/">
        <img src="https://img.shields.io/github/package-json/dependency-version/WatDuhHekBro/OnionLasers/discord.js" alt="Discord.js Version">
    </a>
</p>

A declarative, structure-agnostic, TypeScript-centric command handler for [discord.js](https://discord.js.org/).

*Note: There's an unstable version in the works which uses discord.js v13 (via its `master` branch), installable via `npm install onion-lasers@unstable`. Interfaces defined in this branch are subject to change. I don't recommend using this unless you know what you're doing!*

# Table of Contents

1. [Minimalist Example](#minimalist-example)
2. [An Overview](#an-overview)
3. [Reference: Command](#command-reference)
4. [Reference: Utility Functions](#utility-functions-reference)
5. [Reference: Launcher](#launcher-reference)
6. [Contributing](#contributing)
7. [Design Decisions](#design-decisions)

# Minimalist Example

`src/index.ts`
```ts
import {launch} from "onion-lasers";
import {Client} from "discord.js";
import path from "path";

const client = new Client();
client.login("<enter your token here>");
launch(client, path.join(__dirname, "commands"));
```

`src/commands/query.ts`
```ts
import {Command, NamedCommand, RestCommand} from "onion-lasers";
import {Channel, GuildChannel, User} from "discord.js";

export default new NamedCommand({
    run: "You need to enter some arguments for this command.",
    subcommands: {
        status: new NamedCommand({
            aliases: ["s"],
            run: `Currently running node.js version ${process.version}.`,
            user: new Command({
                async run({send, args}) {
                    const user = args[0] as User;
                    send(`This user ${user.bot ? "is" : "is not"} a bot.`);
                }
            })
        })
    },
    channel: new Command({
        async run({send, args}) {
            const channel = args[0] as Channel;

            if (channel instanceof GuildChannel) {
                send(`The name of this channel is: ${channel.name}`);
            }
        }
    }),
    user: new Command({
        async run({send, args}) {
            const user = args[0] as User;
            send(`The name of this user is: ${user.username}`);
        }
    }),
    id: "user",
    any: new RestCommand({
        async run({send, combined}) {
            send(`You entered: ${combined}`);
        }
    })
});
```

Input | Output
----- | -----
`.query` | You need to enter some arguments for this command.
`.query status` | Currently running node.js version v14.15.4.
`.query s` | Currently running node.js version v14.15.4.
`.query status <@123456789012345678>` | This user is not a bot.
`.query <#123456789012345678>` | The name of this channel is: some channel name
`.query <@123456789012345678>` | The name of this user is: some username
`.query 123456789012345678` | The name of this user is: some username
`.query this is some random text` | You entered: this is some random text

## Note: JavaScript

To use this in JavaScript, you'd use `const <A> = require(<B>)` instead of `import <A> from <B>` and `module.exports = new NamedCommand(...)` instead of `export default new NamedCommand(...)`.

# An Overview

This is a brief overview that'll describe the basics of how this command handler works.

## Creating Commands

## The very basics of a command

```ts
import {NamedCommand} from "onion-lasers";

export default new NamedCommand();
```

To make something actually happen when the command is run however, you implement the `run` property.

```ts
import {Command, NamedCommand} from "onion-lasers";

export default new NamedCommand({
    async run({send}) {
        send("test");
    }
});
```

### Quick note on the run property

You can also enter a string for the `run` property which will send a message with that string specified (you can also specify some variables in that string). The above is functionally equivalent to the below.

```ts
import {Command, NamedCommand} from "onion-lasers";

export default new NamedCommand({
    run: "test"
});
```

## Introducing subcommands

Where this command handler really shines though is from its subcommands feature. You can filter and parse argument lists in a declarative manner.

```ts
import {Command, NamedCommand} from "onion-lasers";

export default new NamedCommand({
    user: new Command({
        async run({message, channel, guild, author, member, client, args}) {
            const user = args[0];
        }
    })
});
```

Here, the command takes one argument which can match a user mention. For example, if this file was named `test.ts`, `$test <@217701976474698097>` would get the user by the ID `217701976474698097` into `args[0]` as a [User](https://discord.js.org/#/docs/main/stable/class/User) object. Do note that `$test experiment` would *not* run as if you just called `$test`, it won't execute.

If you want, you can typecast the argument to be more strongly typed, because the type of `args` is `any[]`. *([See why if you're curious.](#any[]-parameters-for-subcommand-run))*

```ts
import {Command, NamedCommand} from "onion-lasers";
import {User} from "discord.js";

export default new NamedCommand({
    user: new Command({
        async run({message, channel, guild, author, member, client, args}) {
            const user = args[0] as User;
        }
    })
});
```

## Keyed subcommands

For keyed subcommands, you would instead use a `NamedCommand`.

```ts
import {Command, NamedCommand} from "onion-lasers";

export default new NamedCommand({
    run: "one",
    subcommands: {
        bread: new NamedCommand({
            run: "two"
        })
    }
});
```

If the file was named `cat.ts`:
- `$cat` would output `one`
- `$cat bread` would output `two`

Only `bread` in this case would lead to `two` being the output, which is different from the generic subcommand types in previous examples.

You get an additional property with `NamedCommand`s: `aliases`. That means you can define aliases not only for top-level commands, but also every layer of subcommands.

```ts
import {Command, NamedCommand} from "onion-lasers";

export default new NamedCommand({
    aliases: ["potato"],
    subcommands: {
        slice: new NamedCommand({
            aliases: ["pear"]
        })
    }
});
```

For example, if this file was named `plant.ts`, the following would work:
- `$plant`
- `$potato`
- `$plant slice`
- `$plant pear`
- `$potato slice`
- `$potato pear`

## Metadata / Command Properties

You can also specify metadata for commands by adding additional properties. Some of these properties are per-command while others are inherited.

```ts
import {Command, NamedCommand} from "onion-lasers";

export default new NamedCommand({
    description: "desc one",
    subcommands: {
        pineapple: new NamedCommand({
            //...
        })
    }
});
```

`description` is an example of a per-command property (which is used in a help command). If the file was named `siege.ts`:
- The description of `$siege` would be `desc one`.
- There wouldn't be a description for `$siege pineapple`.

This is in contrast to inherited properties.

```ts
import {Command, NamedCommand, CHANNEL_TYPE} from "onion-lasers";

export default new NamedCommand({
    channelType: CHANNEL_TYPE.GUILD,
    subcommands: {
        pineapple: new NamedCommand({
            //...
        })
    }
});
```

Here, the property `channelType` would spread to all subcommands unless a subcommand defines it. Using the above example, the `channelType` for both `$siege` and `$siege pineapple` would be `CHANNEL_TYPE.GUILD`.

## RestCommand to capture an arbitrary amount of arguments

Up until now, we've been working with one argument per subcommand layer. However, what happens if you want to capture the rest of an argument list without there being an error?

```ts
import {Command, NamedCommand} from "onion-lasers";

export default new NamedCommand({
    any: new Command({
        async run({send, args}) {
            //...
        }
    })
});
```

Assuming this file was named `test.ts`, you'd be able to do `$test`, `$test stuff`, and `$test other`, but not `$test more stuff`. In order to get rid of this restriction, use `RestCommand` (which is only available on the `any` type).

```ts
import {NamedCommand, RestCommand} from "onion-lasers";

export default new NamedCommand({
    any: new RestCommand({
        async run({send, args, combined}) {
            //...
        }
    })
});
```

Now `$test more stuff` is possible, and you'd get an extra variable (which is just `args.join(" ")` for convenience). In this case, `args` would be `["more", "stuff"]` and `combined` would be `more stuff`.

# Command Reference

## Subcommand Types

- Keyed Subcommand: Any specifically-defined keywords / string literals.
- `channel`: `<#...>`
- `role`: `<@&...>`
- `emote`: `<::ID>` (The previous two values, animated and emote name respectively, do not matter at all for finding the emote.)
- `message`: Available by using the built-in "Copy Message Link" or "Copy ID" buttons. `https://discordapp.com/channels/<Guild ID>/<Channel ID>/<Message ID>` or `<Channel ID>-<Message ID>`
- `user`: `<@...>` and `<@!...>`
- `guild`: Only available when used with `id: "guild"`, parses a guild based on a given ID
- `id`: Any number with 17-19 digits. Only used as a redirect to another subcommand type.
- `number`: Any valid number via the Number() function, except for NaN and Infinity (because those can really mess with the program).
- `any`: Generic argument case.
- `none`: No subcommands exist.

## Command Metadata

- `description`: The command description that'll appear in the help menu.
- `usage`: Defines a custom usage when showing the command in the help menu.
- `permission`: *(Inherits)* -1 (default) indicates to inherit, 0 is the lowest rank, 1 is second lowest rank, and so on.
- `nsfw`: *(Inherits)* Whether or not the command is restricted to NSFW channels and DM channels.
- `channelType`: *(Inherits)* Whether the command is restricted to guild channels, DM channels, or has no restriction. Uses the `CHANNEL_TYPE` enum provided by the command handler.
- `nameOverride`: Only available on `NamedCommand` instances, allows you to override a command's file name to provide a custom name you want. Used for commands with special characters that aren't allowed in file names.

## Command Menu

- `args`: A list of arguments in the command. It's relative to the subcommand, so if you do `$test this 5`, `5` becomes `$.args[0]` if `this` is a subcommand. Args are already converted, so a `number` subcommand would return a number rather than a string.
- `client`: `message.client`
- `message`: `message`
- `channel`: `message.channel`
- `guild`: `message.guild`
- `author`: `message.author`
- `member`: `message.member`
- `send`: `message.channel.send`
- `reply`: `message.reply`

## Command Var String

- `%author%` - A user mention of the person who called the command.
- `%prefix%` - The prefix of the current guild.
- `%command%` - The command's execution path up to the current subcommand. (i.e. `test user 5`)

# Utility Functions Reference

## paginate()

```ts
const pages = ["one", "two", "three"];

paginate(send, author.id, pages.length, page => {
    return {content: pages[page]};
});
```

## poll()

```ts
const results = await poll(await send("Do you agree with this decision?"), ["✅", "❌"]);
results["✅"]; // number
results["❌"]; // number
```

## confirm()

```ts
const result = await confirm(await send("Are you sure you want to delete this?"), author.id); // boolean | null
```

## askMultipleChoice()

```ts
const result = await askMultipleChoice(await send("Which of the following numbers is your favorite?"), author.id, 4, 10000); // number (0 to 3) | null
```

## askForReply()

```ts
const reply = await askForReply(await send("What is your favorite thing to do?"), author.id, 10000); // Message | null
```

## generateOneTimePrompt()

Utility function to generate a reactor collector that automatically deletes. See the source for the other utility functions to see how to make your own using this.

## reactInOrder()

Starts a parallel chain of ordered reactions so that it doesn't block the main chain of execution. If the message is deleted, it'll prevent any errors from throwing and end the loop early.

## Miscellaneous Utility Functions

- `getGuildByID(string)`
- `getGuildByName(string)`
- `getChannelByID(string)`
- `getChannelByName(string)`
- `getMessageByID(string)`
- `getUserByID(string)`
- `getUserByName(string)`
- `getUserByNickname(Discord.Guild, string)`
- `getMemberByID(Discord.Guild, string)`
- `getMemberByName(Discord.Guild, string)`

## getCommandList()

Utility function for creating your own help command. Returns a list of categories and their associated commands.

```ts
const result = await getCommandList();

for(const [category, commandList] of result.entries()) {
    //...
}
```

## getCommandInfo()

Utility function for creating your own help command. Resolves a command based on the arguments given.

```ts
const resultingBlob = await getCommandInfo(args);
if (typeof resultingBlob === "string") return send(resultingBlob);
const [result, category] = resultingBlob; // result is of type CommandInfo, see below
```

Property | Type | Description
----- | ----- | -----
`command` | `BaseCommand` | The resolved command
`permission` | `number` | The inherited permission level of the current command
`nsfw` | `boolean` | The inherited NSFW restriction of the current command
`channelType` | `CHANNEL_TYPE` | The inherited server/DM restriction of the current command
`subcommandInfo` | `Collection<string, BaseCommand>` | A list of symbolic args and their corresponding commands (for example, `<channel>` instead of `<#123456789012345678>` as the key)
`keyedSubcommandInfo` | `Collection<string, BaseCommand>` | A list of keyed subcommand's original names and their corresponding commands
`header` | `string` | The root command (i.e. `info` of `$info user 5`)
`args` | `string[]` | The rest of the command invocation (i.e. `user 5` of `$info user 5`)

## hasPermission()

Checks if a user has permission to execute a command. `member` is optional so as to allow permissions to exist outside of guilds.

```ts
if(hasPermission(user, member)) {
    //...
}
```

## getPermissionLevel()

Gets the number corresponding to the user's permission level as provided to the [launch settings](#launcher-reference).

```ts
const level = getPermissionLevel(user, member); // number
```

## getPermissionName()

Gets the name corresponding to the user's permission level as provided to the [launch settings](#launcher-reference).

```ts
const name = getPermissionName(level); // string
```

## addInterceptRule()

Allows you to add custom conditions where the command handler should *not* execute.

```ts
addInterceptRule(message => message.content === ".test");
```

## setExecuteCommandListener()

This will allow you to capture the command and command arguments for keeping track of the last command or to do something whenever a command is executed.

*An example rejection handler which uses last executed command info along with events:*

```ts
let lastEvent = "N/A";
let lastCommandInfo: {
    header: string;
    args: string[];
    channel: TextChannel | DMChannel | NewsChannel | null;
} = {
    header: "N/A",
    args: [],
    channel: null
};

process.on("unhandledRejection", (reason: any) => {
    const isDiscordError = reason?.name === "DiscordAPIError";

    if (isDiscordError) {
        // If it's a DiscordAPIError on a message event, I'll make the assumption that it comes from the command handler.
        // That's not always the case though, especially if you add your own message events. Just be wary of that.
        if (lastEvent === "message") {
            console.error(
                `Command Error: ${lastCommandInfo.header} (${lastCommandInfo.args.join(", ")})\n${reason.stack}`
            );
            lastCommandInfo.channel?.send(
                `There was an error while trying to execute that command!\`\`\`${reason.stack}\`\`\``
            );
        } else {
            console.error(`@${lastEvent}\n${reason.stack}`);
        }
    }
});

// Store info on which command was executed last.
setExecuteCommandListener(({header, args, channel}) => {
    lastCommandInfo = {
        header,
        args,
        channel
    };
});

// This will dynamically attach all known events instead of doing it manually.
// As such, it needs to be placed after all other events are attached or the tracking won't be done properly.
for (const event of client.eventNames()) {
    client.on(event, () => {
        lastEvent = event.toString();
    });
}
```

## SingleMessageOptions

A typedef to return a Discord message (which could send a string, embed, attachments, or all of them at the same time).

## SendFunction

A typedef to simplify accessing the `send()` method and all of its overloads. Very useful if you're creating a function where you pass `send` as a parameter.

# Launcher Reference

Last, and probably least, is the launcher. This attaches the core `message` event to the client and loads commands from wherever the user specifies. Although this is what makes the command handler actually activate, there's not much to say about it.

```ts
launch(client, commandsDirectory, launchSettings);
```

Parameter | Type | Description
----- | ----- | -----
`client` | `Discord.Client`
`commandsDirectory` | `string` | The path to wherever your commands are loaded from.
`launchSettings.permissionLevels` | `{name: string, check: (Discord.User, Discord.GuildMember \| null) => boolean}[]` | The permission metadata to attach to the command handler, allowing you to set names on permission levels and then creating different permission levels.
`launchSettings.getPrefix` | `(Discord.Guild \| null) => string` | Callback to determine what prefix your bot listens to which can also change depending on the guild the message is coming from.
`launchSettings.categoryTransformer` | `(string) => string` | Takes the folder name for each command category and transforms the text. This allows you to choose if you want to use spaces or kebab-case for your project for example.
`launchSettings.useTSExtension` | `boolean` | Whether or not to scan for `.ts` instead of `.js` during command loading.

# Contributing

## Setting up the development environment for Onion Lasers

1. Go to the root folder
2. `npm install`
3. `npm start`
4. Go to the `playground` folder in another process
5. Add `.env` and set `TOKEN` equal to whatever your bot's token is
6. `npm start`
7. Create `playground/src/commands` and add whatever commands in there
8. Now, any changes to either the command handler as well as the playground code should automatically reload the test bot

## Version and Release Stuff

- Update the [changelog](CHANGELOG.md).
- Update the version numbers in [package.json](package.json) and [package-lock.json](package-lock.json).
- The pre-commit hook that calls `npm test` and `npm run format` *should* be automatically called by Husky during the installation phase.

# Design Decisions

## Using the Command Class

### any[] Parameters For Subcommand Run

Unless there's some sort of TypeScript wizardry to solve this, the `args` parameter in the subcommand type will have to be `any[]` because it's simply too context-dependent to statically figure it out.
- Each subcommand is its own layer which doesn't know about parent commands at compile-time.
- Subcommands can be split into different files for code maintainability.
- Even though the last argument is able to be strongly-typed, if you have multiple parameters, you'd essentially only get static benefits for one of the arguments, and you wouldn't even know the location of that one argument.
- Overall, it's just easier to use your best judgement then use type assertions.

### Channel Type Type Guards

Although type guards for channel types would work [as the issue for discriminated union callbacks with a default parameter was fixed](https://github.com/microsoft/TypeScript/issues/41759), because each `Command` instance is isolated from each other, the `channelType` would only affect the current instance rather than any instance down the line.

So instead, use non-null assertions when setting the `channelType`. For example:

```ts
import {Command, NamedCommand, CHANNEL_TYPE} from "onion-lasers";
import {TextChannel} from "discord.js";

export default new NamedCommand({
    channelType: CHANNEL_TYPE.GUILD,
    async run({message, channel, guild, author, member, client, args}) {
        console.log(guild!.name);
        console.log(member!.nickname);
        console.log((channel as TextChannel).name !== "dm");
    }
});
```

```ts
import {Command, NamedCommand, CHANNEL_TYPE} from "onion-lasers";
import {DMChannel} from "discord.js";

export default new NamedCommand({
    channelType: CHANNEL_TYPE.DM,
    async run({message, channel, guild, author, member, client, args}) {
        console.log(guild === null);
        console.log(member === null);
        console.log((channel as DMChannel).type === "dm");
    }
});
```

The three guarantees are whether or not `guild` will be `null`, whether or not `member` will be `null`, and the type of `channel`.

*Take note that while `member` can still be `null` even in a guild (for example, if you target a message by someone who left), `member` cannot be `null` here because the `message` being sent must be by someone who is in the guild by this point.*

### Uneven Return Paths

`Command.run` doesn't use the return values for anything, so it's safe to do `return send(...)` to merge those two statements. However, you'll come across an error: `Not all code paths return a value.`

There are several ways to resolve this issue:
- Split all `return send(...)` statements to `{send(...); return;}`
- Set an explicit any return type in the function header: `async run(...): Promise<any> {`
- Add an extra `return` statement at the end of each path

### Type Guards

The `Command` class is implemented in a certain way to provide type guards which reduce unnecessary properties at compile-time rather than warning the user at runtime.
- The reason `NamedCommand` (which extends `Command`) exists is to provide a type guard for `aliases`. After all, `aliases` doesn't really make sense for generic subcommand types - how would you handle an alias for a type that accepts a number for example?
- The `endpoint` property changes what other properties are available via a discriminated union. If `endpoint` is `true`, no subcommands of any type can be defined. After all, it wouldn't make sense logically.

### Boolean Types

Boolean subcommand types won't be implemented:
- Since there are only two values, why not just put it under `subcommands`?
- If boolean types were to be implemented, how many different types of input would have to be considered? `yes`/`no`, `y`/`n`, `true`/`false`, `1`/`0`, etc.

### Hex and Octal Number Types

For common use cases, there wouldn't be a need to go accept numbers of different bases. The only time it would be applicable is if there was some sort of base converter command, and even then, it'd be better to just implement custom logic.

### User Mention + Search by Username Type

While it's a pretty common pattern, it's probably a bit too specific for the `Command` class itself. Instead, this pattern will be comprised of two subcommands: A `user` type and an `any` type.

## The Command Handler

### The Scope of the Command Handler

What this does:
- Provides the `Command`/`NamedCommand` classes.
- Dynamically loads commands and attaches runtime metadata.
- Provides utility functions specific to Discord to make certain patterns of commands less tedious to implement.

What this doesn't do:
- Manage the general file system or serialization/deserialization of data.
- Provide general utility functions.
- Provide any Discord-related functionality besides strictly command handling.

### Client Creation

Creating the client is beyond the scope of the command handler and will not be abstracted away. Instead, the user will simply attach the command handler to the client to initialize it.
- This makes it so if a user wants to specify their own `ClientOptions` when instantiating the client, it's less troublesome to implement.
- The user can export the client and use it throughout different parts of their code.

### Bot-Specific Mentions

Pinging the bot will display the current guild prefix. The bot mention will not serve as an alternate prefix.
- When talking about a bot, the bot might be pinged to show who it is. It could be in the middle (so don't listen for a prefix anywhere) or it could be at the start (so only listen to a standalone ping).
- It likely isn't a common use case to ping the bot. The only time it would really shine is in the event two bots have a prefix conflict, but the command that changes prefixes can simply add a parameter to deal with that case. For example, instead of `@bot set prefix <prefix>`, you'd use `set prefix <prefix> @bot`.

### Direct Messages

When direct messaging a bot, no prefixes will be used at all because it's assumed that you're executing a command. Because the only people allowed is the user and the bot, NSFW-only commands can also be executed here.

### Permission Setup

Because the command handler provides no specific permission set, it's up to the user to come up with functions to add permissions as well as create the enum that assigns permissions.
- The `permission` property of a `Command` instance is `-1` by default, which means to inherit the permission level from the parent command. If you want, you can create your enum like this: `enum Permissions {INHERIT = -1, USER, ADMIN}`, where `Permissions.USER = 0` and `Permissions.ADMIN = 1`.

## Miscellaneous

### Static Event Loading

While dynamic loading fits very well with commands, it was more or less clunky design to try and make events fit the same model:
- There are no restrictions when it comes to command names, and the name of the file will determine the name of the command, which avoids repetition. Events on the other hand involved lots of boilerplate to get static types back.
- Since there can be multiple listeners per event, large event files can be split up into more organized blocks.
- Likewise, small event listeners which span multiple events can be grouped together like `channelCreate` and `channelDelete`, showing the relation in one single file rather than splitting them up just because they're two different events.
