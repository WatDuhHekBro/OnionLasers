import {launch} from "../..";
import {Client} from "discord.js";
import dotenv from "dotenv";
import path from "path";

export const client = new Client();
dotenv.config();

client
    .login(process.env.TOKEN)
    .then(() => console.log("Successfully logged in."))
    .catch(console.error);

launch(client, path.join(__dirname, "commands"), {
    getPrefix: () => "$"
});
