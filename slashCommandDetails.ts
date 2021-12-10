// Top-level slash command (no subcommands or subcommand groups)
new SlashCommand({
    name: "info", // "name" is optional as the command name will be provided by the file name. However, you can override it with this property.
    description: "Some text here...", // Unless "description" defaults to "No description.", it is required.
    guilds: [], // string[] - Global command if it's empty, guild command if not.
    enabledByDefault: true, // boolean (default: true)
    whitelist: {
        users: [], // Substitute for {type: "USER", permission: true}
        roles: [] // Substitute for {type: "ROLE", permission: true}
    },
    blacklist: {
        users: [], // Substitute for {type: "USER", permission: false}
        roles: [] // Substitute for {type: "ROLE", permission: false}
    },
    options: [
        {
            type: "STRING", // enum
            name: "parameter",
            description: "Some text here...",
            required: false // This property is optional (default: false)
        }
        // ...
    ],
    // "interaction" is of type CommandInteraction
    async handler(interaction) {
        // No clue how to get the info from "options" to match a potential "args" parameter, so this instead is the way to get arguments.
        // Passing true to required (in getString()) will make it throw an error if no string argument "parameter" exists, i.e. if the command isn't setup properly.
        const value = interaction.options.getString("parameter", true);

        // ...
    }
});

// Slash command with subcommands and subcommand groups (both can coexist)
// Because of the way slash commands are setup, the top-level "handler"/"options" and "subcommands" properties are mutually exclusive.
new SlashCommand({
    name: "info",
    description: "Some text here...",
    // Because hard permissions like restricting to a role isn't possible in subcommands, these properties will only appear at the top.
    guilds: [],
    enabledByDefault: true,
    whitelist: {
        users: [],
        roles: []
    },
    blacklist: {
        users: [],
        roles: []
    },
    subcommands: {
        // The "name" property is implied, so for this one, it'd be "name": "one".
        one: {
            description: "Some text here...",
            options: [
                // ...
            ],
            async handler(interaction) {
                // ...
            }
        },
        two: {
            description: "Some text here...", // I'm not sure if this ever actually appears, but Discord's API requires it.
            // This property is what turns "two" into a subcommand group. Again, "handler" and "options" cannot coexist with "subcommands".
            subcommands: {
                // Same structure as a subcommand, like "one" above.
                subone: {
                    description: "Some text here...",
                    options: [
                        // ...
                    ],
                    async handler(interaction) {
                        // ...
                    }
                }
                // ...
            }
        }
    }
});

///////////////////
// Miscellaneous //
///////////////////
// - Besides hard permission checking (makes Discord gray out certain slash commands for an excluded user or role), soft
//   permission checking can also be used, which is basically looking at whether the user meets certain conditions when
//   they execute a command, sending an ephemeral reply telling them they don't meet those requirements if not.
// - The same principle above would apply when checking if a channel is marked as NSFW or whether a channel is from a
//   guild or DM.
// - During the loading process, ApplicationCommandManager.set() is used to load the commands into Discord. For
//   permissions like roles which can be updated while the bot is running, ApplicationCommandPermissionsManager.set()
//   would be used instead.
//   - An exported function for the latter would be provided for whenever the bot needs to send a permission update.
//   - The former would be called once every time the bot is loaded up. In production mode (global slash commands), the
//     bot is meant to stay up, so there wouldn't be too many API calls. For development mode (guild slash commands),
//     you choose the guild to test commands on and it'll instantly update unlike global slash commands.
// - Export the Subcommand and SubcommandGroup interfaces for modularization.
