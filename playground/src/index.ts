import {launch, setExecuteCommandListener} from "../..";
import {Client, TextChannel, DMChannel, NewsChannel, Intents, PartialDMChannel, ThreadChannel} from "discord.js";
import path from "path";

export const client = new Client({
    intents: [
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
        Intents.FLAGS.DIRECT_MESSAGE_TYPING,
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_BANS,
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
        Intents.FLAGS.GUILD_INTEGRATIONS,
        Intents.FLAGS.GUILD_INVITES,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_MESSAGE_TYPING,
        Intents.FLAGS.GUILD_PRESENCES,
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.GUILD_WEBHOOKS
    ]
});

client
    .login(process.env.TOKEN)
    .then(() => console.log(`Successfully logged in as ${client.user!.tag}.`))
    .catch(console.error);

launch(client, path.join(__dirname, "commands"), {
    getPrefix: () => "$"
});

// Error Handling //

let lastEvent = "N/A";
let lastCommandInfo: {
    header: string;
    args: string[];
    channel: TextChannel | DMChannel | NewsChannel | PartialDMChannel | ThreadChannel | null;
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
