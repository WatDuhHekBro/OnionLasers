import {
    Client,
    Collection,
    CommandInteraction,
    ApplicationCommandData,
    ApplicationCommandOptionData,
    ApplicationCommandOptionChoice
} from "discord.js";
import {slashCommandRegistry} from "./loader";
import {NO_DESCRIPTION} from "./util";

export enum SlashCommandOptionType {
    STRING = 3,
    INTEGER = 4,
    BOOLEAN = 5,
    USER = 6,
    CHANNEL = 7,
    ROLE = 8,
    MENTIONABLE = 9
}

interface RestrictedApplicationCommandOptionBase {
    type: Exclude<SlashCommandOptionType, SlashCommandOptionType.STRING | SlashCommandOptionType.INTEGER>;
    name: string;
    description?: string;
    required?: boolean;
}

interface RestrictedApplicationCommandOptionString {
    type: SlashCommandOptionType.STRING;
    name: string;
    description?: string;
    required?: boolean;
    choices?: {[name: string]: string};
}

interface RestrictedApplicationCommandOptionInteger {
    type: SlashCommandOptionType.INTEGER;
    name: string;
    description?: string;
    required?: boolean;
    choices?: {[name: string]: number};
}

type RestrictedApplicationCommandOption =
    | RestrictedApplicationCommandOptionBase
    | RestrictedApplicationCommandOptionString
    | RestrictedApplicationCommandOptionInteger;

interface SlashCommandOptionsRootBase {
    readonly description?: string;
    readonly guilds?: string[]; // An empty array indicates a global slash command.
    readonly enabledByDefault?: boolean;
}

interface SlashCommandOptionsRootEndpoint extends SlashCommandOptionsRootBase {
    readonly ephemeral?: boolean;
    readonly run?: (interaction: CommandInteraction) => Promise<any> | string;
    readonly options?: RestrictedApplicationCommandOption[];
    readonly subcommands?: undefined;
}

interface SlashCommandOptionsRootGroup extends SlashCommandOptionsRootBase {
    readonly subcommands: {[name: string]: SlashCommandOptionsNode};
}

type SlashCommandOptionsRoot = SlashCommandOptionsRootEndpoint | SlashCommandOptionsRootGroup;

interface SlashCommandOptionsNodeBase {
    readonly description?: string;
}

interface SlashCommandOptionsEndpoint extends SlashCommandOptionsNodeBase {
    readonly ephemeral?: boolean;
    readonly run?: (interaction: CommandInteraction) => Promise<any> | string;
    readonly options?: RestrictedApplicationCommandOption[];
    readonly subcommands?: undefined;
}

// For subcommand groups or a base command with subcommand groups / subcommands.
// No parameters or execution path will be allowed as it can never happen.
interface SlashCommandOptionsGroup extends SlashCommandOptionsNodeBase {
    // By setting it to an endpoint, subcommands cannot be defined the next level down.
    readonly subcommands: {[name: string]: SlashCommandOptionsEndpoint};
}

type SlashCommandOptionsNode = SlashCommandOptionsEndpoint | SlashCommandOptionsGroup;

export class SlashCommand {
    private readonly data: SlashCommandOptionsRoot;

    constructor(data: SlashCommandOptionsRoot = {}) {
        this.data = data;
    }

    /**
     * Convert the command into a slash command usable by Discord's API.
     */
    public compile(name: string): ApplicationCommandData {
        let options: ApplicationCommandOptionData[] | undefined;

        if (this.data.subcommands) {
            options = [];

            for (const [header, subcommand] of Object.entries(this.data.subcommands)) {
                if (subcommand.subcommands) {
                    const suboptions: ApplicationCommandOptionData[] = [];

                    for (const [subheader, subsubcommand] of Object.entries(subcommand.subcommands)) {
                        suboptions.push({
                            name: subheader,
                            description: subsubcommand.description || NO_DESCRIPTION,
                            type: 1, // SUBCOMMAND
                            options: SlashCommand.getOptionsArray(subsubcommand.options)
                        });
                    }

                    options.push({
                        name: header,
                        description: subcommand.description || NO_DESCRIPTION,
                        type: 2, // SUBCOMMAND_GROUP
                        options: suboptions
                    });
                } else {
                    options.push({
                        name: header,
                        description: subcommand.description || NO_DESCRIPTION,
                        type: 1, // SUBCOMMAND
                        options: SlashCommand.getOptionsArray(subcommand.options)
                    });
                }
            }
        } else {
            options = SlashCommand.getOptionsArray(this.data.options);
        }

        return {
            name,
            description: this.data.description || NO_DESCRIPTION,
            defaultPermission: this.data.enabledByDefault,
            options
        };
    }

    public async execute(interaction: CommandInteraction) {
        interaction.reply("Soon:tm:");
    }

    private static getOptionsArray(
        data?: RestrictedApplicationCommandOption[]
    ): ApplicationCommandOptionData[] | undefined {
        if (!data) return undefined;

        const options: ApplicationCommandOptionData[] = [];

        for (const inboundOptions of data) {
            const {type, name, description, required} = inboundOptions;
            let choices: ApplicationCommandOptionChoice[] | undefined;

            // Apparently, inboundOptions.type must be used instead of type. Don't ask me why.
            if (
                (inboundOptions.type === SlashCommandOptionType.STRING ||
                    inboundOptions.type === SlashCommandOptionType.INTEGER) &&
                inboundOptions.choices
            ) {
                choices = [];

                for (const [name, value] of Object.entries(inboundOptions.choices)) {
                    choices.push({name, value});
                }
            } else {
                choices = undefined;
            }

            options.push({
                type,
                name,
                description: description || NO_DESCRIPTION,
                required,
                choices
            });
        }

        return options;
    }

    public get guilds(): string[] {
        return this.data.guilds ?? [];
    }
}

// If devServers is an empty array, assume you're not in dev mode.
// Otherwise, it'll restrict all slash commands to those guilds and remove existing global ones.
export function attachSlashCommandHandlerToClient(client: Client, devServers: string[]) {
    // Send the compiled commands to Discord's API.
    client.once("ready", () => {
        if (devServers.length === 0) {
            const globalCommandData: ApplicationCommandData[] = [];
            const guildCommandDataCollection = new Collection<string, ApplicationCommandData[]>();

            // Loop through the commands and see which ones map to which.
            for (const [name, command] of slashCommandRegistry.entries()) {
                if (command.guilds.length === 0) {
                    globalCommandData.push(command.compile(name));
                } else {
                    for (const id of command.guilds) {
                        if (!guildCommandDataCollection.has(id)) guildCommandDataCollection.set(id, []);
                        guildCommandDataCollection.get(id)!.push(command.compile(name));
                    }
                }
            }

            // Then bulk set every one.
            if (client.application) {
                client.application.commands.set(globalCommandData).catch(console.error);
            } else {
                console.warn("client.application is somehow undefined. Global slash commands will not be set.");
            }

            for (const [id, guildCommandData] of guildCommandDataCollection.entries()) {
                const guild = client.guilds.cache.get(id);

                if (guild) {
                    guild.commands.set(guildCommandData).catch(console.error);
                } else {
                    console.warn(
                        `No guild was found by the ID of ${id}. Slash commands will not be set for this guild.`
                    );
                }
            }
        } else {
            const commandData = slashCommandRegistry.map((command, name) => command.compile(name));

            for (const id of devServers) {
                const guild = client.guilds.cache.get(id);

                if (guild) {
                    guild.commands.set(commandData).catch(console.error);
                } else {
                    console.warn(
                        `No guild was found by the ID of ${id}. Slash commands will not be set for this guild.`
                    );
                }
            }
        }
    });

    // Then listener for incoming commands.
    client.on("interaction", async (interaction) => {
        if (interaction.isCommand()) {
            if (slashCommandRegistry.has(interaction.commandName)) {
                const command = slashCommandRegistry.get(interaction.commandName)!;

                // Errors will silently fail apparently and then there'll be an "failed response" message.
                try {
                    await command.execute(interaction);
                } catch (error) {
                    const errorMessage = error?.stack ?? error;
                    console.error(errorMessage); // TODO: Add the executed command info.
                    interaction.reply(
                        `There was an error while trying to execute that command!\n\`\`\`${errorMessage}\`\`\``
                    );
                }
            } else {
                interaction.reply(
                    "Sorry, this command didn't match anything (add more text here about potential codebase error or outdated slash commands)"
                );
            }
        }
    });
}
