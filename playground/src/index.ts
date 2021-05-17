import {launch, setExecuteCommandListener} from "../..";
import {Client, TextChannel, DMChannel, NewsChannel} from "discord.js";
import dotenv from "dotenv";
import path from "path";

export const client = new Client();
dotenv.config();

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
