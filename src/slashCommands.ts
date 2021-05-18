import {Client, ApplicationCommandData, Collection, CommandInteraction} from "discord.js";
import {slashCommandRegistry} from "./loader";

export class SlashCommand {
    public readonly guilds: string[];
    data: ApplicationCommandData;
    execute: (interaction: CommandInteraction) => void;

    constructor(data: ApplicationCommandData, execute: (interaction: CommandInteraction) => void) {
        this.guilds = [];
        this.data = data;
        this.execute = execute;
    }

    /**
     * Convert the command into a slash command usable by Discord's API.
     */
    public compile(): ApplicationCommandData {
        return this.data;
    }

    /*public execute(interaction: Interaction) {
        //
    }*/
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
            for (const command of slashCommandRegistry.values()) {
                if (command.guilds.length === 0) {
                    globalCommandData.push(command.compile());
                } else {
                    for (const id of command.guilds) {
                        if (!guildCommandDataCollection.has(id)) guildCommandDataCollection.set(id, []);
                        guildCommandDataCollection.get(id)!.push(command.compile());
                    }
                }
            }

            // Then bulk set every one.
            if (client.application) {
                client.application.commands.set(globalCommandData);
            } else {
                console.warn("client.application is somehow undefined. Global slash commands will not be set.");
            }

            for (const [id, guildCommandData] of guildCommandDataCollection.entries()) {
                const guild = client.guilds.cache.get(id);

                if (guild) {
                    guild.commands.set(guildCommandData);
                } else {
                    console.warn(
                        `No guild was found by the ID of ${id}. Slash commands will not be set for this guild.`
                    );
                }
            }
        } else {
            const commandData = slashCommandRegistry.map((command) => command.compile());

            for (const id of devServers) {
                const guild = client.guilds.cache.get(id);

                if (guild) {
                    guild.commands.set(commandData);
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
                command.execute(interaction);
            } else {
                interaction.reply(
                    "Sorry, this command didn't match anything (add more text here about potential codebase error or outdated slash commands)"
                );
            }
        }
    });
}
