import {
    Client,
    Collection,
    CommandInteraction,
    ApplicationCommandData,
    ApplicationCommandOptionData,
    ApplicationCommandOptionChoice,
    CommandInteractionOption,
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

// And thus, I shall commit one of the greatest sins of my time using TypeScript because I don't know a better way to do this.
// Please have mercy on me. No one should ever have to bear witness to this travesty.

interface RestrictedApplicationCommandOptionBase {
    name: string;
    description?: string;
}
interface RestrictedApplicationCommandOptionString extends RestrictedApplicationCommandOptionBase {
    type: SlashCommandOptionType.STRING;
    choices?: {[name: string]: string};
}
interface RestrictedApplicationCommandOptionStringRequired extends RestrictedApplicationCommandOptionString {
    required: true;
}
interface RestrictedApplicationCommandOptionStringOptional extends RestrictedApplicationCommandOptionString {
    required?: false;
}
interface RestrictedApplicationCommandOptionInteger extends RestrictedApplicationCommandOptionBase {
    type: SlashCommandOptionType.INTEGER;
    choices?: {[name: string]: number};
}
interface RestrictedApplicationCommandOptionIntegerRequired extends RestrictedApplicationCommandOptionInteger {
    required: true;
}
interface RestrictedApplicationCommandOptionIntegerOptional extends RestrictedApplicationCommandOptionInteger {
    required?: false;
}
interface RestrictedApplicationCommandOptionBoolean extends RestrictedApplicationCommandOptionBase {
    type: SlashCommandOptionType.BOOLEAN;
}
interface RestrictedApplicationCommandOptionBooleanRequired extends RestrictedApplicationCommandOptionBoolean {
    required: true;
}
interface RestrictedApplicationCommandOptionBooleanOptional extends RestrictedApplicationCommandOptionBoolean {
    required?: false;
}
interface RestrictedApplicationCommandOptionUser extends RestrictedApplicationCommandOptionBase {
    type: SlashCommandOptionType.USER;
}
interface RestrictedApplicationCommandOptionUserRequired extends RestrictedApplicationCommandOptionUser {
    required: true;
}
interface RestrictedApplicationCommandOptionUserOptional extends RestrictedApplicationCommandOptionUser {
    required?: false;
}
interface RestrictedApplicationCommandOptionChannel extends RestrictedApplicationCommandOptionBase {
    type: SlashCommandOptionType.CHANNEL;
}
interface RestrictedApplicationCommandOptionChannelRequired extends RestrictedApplicationCommandOptionChannel {
    required: true;
}
interface RestrictedApplicationCommandOptionChannelOptional extends RestrictedApplicationCommandOptionChannel {
    required?: false;
}
interface RestrictedApplicationCommandOptionRole extends RestrictedApplicationCommandOptionBase {
    type: SlashCommandOptionType.ROLE;
}
interface RestrictedApplicationCommandOptionRoleRequired extends RestrictedApplicationCommandOptionRole {
    required: true;
}
interface RestrictedApplicationCommandOptionRoleOptional extends RestrictedApplicationCommandOptionRole {
    required?: false;
}
interface RestrictedApplicationCommandOptionMentionable extends RestrictedApplicationCommandOptionBase {
    type: SlashCommandOptionType.MENTIONABLE;
}
interface RestrictedApplicationCommandOptionMentionableRequired extends RestrictedApplicationCommandOptionMentionable {
    required: true;
}
interface RestrictedApplicationCommandOptionMentionableOptional extends RestrictedApplicationCommandOptionMentionable {
    required?: false;
}

type RestrictedApplicationCommandOption =
    | RestrictedApplicationCommandOptionStringRequired
    | RestrictedApplicationCommandOptionStringOptional
    | RestrictedApplicationCommandOptionIntegerRequired
    | RestrictedApplicationCommandOptionIntegerOptional
    | RestrictedApplicationCommandOptionBooleanRequired
    | RestrictedApplicationCommandOptionBooleanOptional
    | RestrictedApplicationCommandOptionUserRequired
    | RestrictedApplicationCommandOptionUserOptional
    | RestrictedApplicationCommandOptionChannelRequired
    | RestrictedApplicationCommandOptionChannelOptional
    | RestrictedApplicationCommandOptionRoleRequired
    | RestrictedApplicationCommandOptionRoleOptional
    | RestrictedApplicationCommandOptionMentionableRequired
    | RestrictedApplicationCommandOptionMentionableOptional;

interface UserMemberArgument {
    user: User;
    member: GuildMember;
}

type MentionableArgument = UserMemberArgument | Role;

// Input RestrictedApplicationCommandOption and it'll resolve to <type> or <type | null>.
// Usage: SlashCommandOptionTypeTypeResolver<typeof thing>
type SlashCommandOptionTypeTypeResolver<
    T extends RestrictedApplicationCommandOption
> = T["type"] extends SlashCommandOptionType.STRING
    ? T["required"] extends true
        ? string
        : string | null
    : T["type"] extends SlashCommandOptionType.INTEGER
    ? T["required"] extends true
        ? number
        : number | null
    : T["type"] extends SlashCommandOptionType.BOOLEAN
    ? T["required"] extends true
        ? boolean
        : boolean | null
    : T["type"] extends SlashCommandOptionType.USER
    ? T["required"] extends true
        ? UserMemberArgument
        : UserMemberArgument | null
    : T["type"] extends SlashCommandOptionType.CHANNEL
    ? T["required"] extends true
        ? GuildChannel
        : GuildChannel | null
    : T["type"] extends SlashCommandOptionType.ROLE
    ? T["required"] extends true
        ? Role
        : Role | null
    : T["type"] extends SlashCommandOptionType.MENTIONABLE
    ? T["required"] extends true
        ? MentionableArgument
        : MentionableArgument | null
    : null;

// Input RestrictedApplicationCommandOption[] and it'll resolve to <[boolean, string | null]> for example.
type SlashCommandOptionTypeTupleTypeResolver<
    T extends [RestrictedApplicationCommandOption, RestrictedApplicationCommandOption]
> = [T[0], T[1]];

// This should be the end of that abomination's code segment.
// Sure, I could do "type: Exclude<SlashCommandOptionType, SlashCommandOptionType.STRING | SlashCommandOptionType.INTEGER>".
// The problem is, I don't know how to extract the types of an actual object.
// Doing "typeof thing" would only bring up SlashCommandOptionType instead of the actual value.
// On top of that, "required" changes whether or not the value is null, but I don't know how to do that in a succinct way either.

const a: [RestrictedApplicationCommandOption, RestrictedApplicationCommandOption] = [
    {
        type: SlashCommandOptionType.BOOLEAN,
        name: "nop",
        required: true
    },
    {
        type: SlashCommandOptionType.STRING,
        name: "nop"
    }
];
type test = SlashCommandOptionTypeTupleTypeResolver<typeof a>;

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

    public async execute(interaction: CommandInteraction): Promise<void> {
        let options: CommandInteractionOption[] = interaction.options;

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
                options = subsuboption.options || [];
                console.debug(1, header, subheader, options);
                subsubcommand;
            } else {
                options = suboption.options || [];
                console.debug(2, header, options);
                subcommand;
            }
        } else {
            console.debug(4, options);
            this.data;
        }

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
                    "Sorry, this command didn't match anything in the registry. This might have been caused by the command list failing to sync up.\n\nKeep in mind that there's a delay for up to an hour when loading global commands while guild commands update instantly.",
                    {
                        ephemeral: true
                    }
                );
            }
        }
    });
}
