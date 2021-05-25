import {
    Client,
    Collection,
    CommandInteraction,
    CommandInteractionOption,
    ApplicationCommandData,
    ApplicationCommandOptionData,
    ApplicationCommandOptionChoice,
    User,
    GuildMember,
    GuildChannel,
    Role
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

type SlashCommandExecuteFunction =
    | ((interaction: CommandInteraction, options: CommandInteractionArgument[]) => Promise<any>)
    | string;

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
    readonly run?: SlashCommandExecuteFunction;
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
    readonly run?: SlashCommandExecuteFunction;
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
                            options: getOptionsArray(subsubcommand.options)
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
                        options: getOptionsArray(subcommand.options)
                    });
                }
            }
        } else {
            options = getOptionsArray(this.data.options);
        }

        return {
            name,
            description: this.data.description || NO_DESCRIPTION,
            defaultPermission: this.data.enabledByDefault,
            options
        };
    }

    public async execute(interaction: CommandInteraction): Promise<void> {
        // Don't waste any lines of code on checking whether or not the option type is valid.
        // If these safety guarantees aren't actually there, then the code needs fixing.
        // Types of SUBCOMMAND_GROUP and SUBCOMMAND will be guaranteed to have exactly one element.
        if (this.data.subcommands) {
            const suboption = interaction.options[0];
            const header = suboption.name;
            const subcommand = this.data.subcommands[header];

            if (subcommand.subcommands) {
                const subsuboption = suboption.options![0];
                const subheader = subsuboption.name;
                const subsubcommand = subcommand.subcommands[subheader];
                executeSlashCommand(interaction, subsubcommand.run, subsuboption.options);
            } else {
                executeSlashCommand(interaction, subcommand.run, suboption.options);
            }
        } else {
            executeSlashCommand(interaction, this.data.run, interaction.options);
        }
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

function getOptionsArray(data?: RestrictedApplicationCommandOption[]): ApplicationCommandOptionData[] | undefined {
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

interface UserMemberArgument {
    user: User;
    member: GuildMember;
}

type CommandInteractionArgument = string | number | boolean | UserMemberArgument | GuildChannel | Role | null;

function transformOptionsArray(options: CommandInteractionOption[]): CommandInteractionArgument[] {
    const parameters: CommandInteractionArgument[] = [];

    for (const option of options) {
        switch (option.type) {
            case "STRING":
            case "INTEGER":
            case "BOOLEAN":
                parameters.push(option.value!);
                break;
            case "USER":
                parameters.push({
                    user: option.user!,
                    member: option.member // Likely unsafe
                });
                break;
            case "CHANNEL":
                parameters.push(option.channel);
                break;
            case "ROLE":
                parameters.push(option.role);
                break;
            case "MENTIONABLE":
                if (option.user) {
                    parameters.push({
                        user: option.user,
                        member: option.member
                    });
                } else {
                    parameters.push(option.role);
                }
                break;
        }
    }

    return parameters;
}

async function executeSlashCommand(
    interaction: CommandInteraction,
    run?: SlashCommandExecuteFunction,
    options: CommandInteractionOption[] = []
) {
    if (typeof run === "string") {
        interaction.reply(run);
    } else if (run) {
        run(interaction, transformOptionsArray(options));
    } else {
        interaction.reply("No action was set on this command!");
    }
}
