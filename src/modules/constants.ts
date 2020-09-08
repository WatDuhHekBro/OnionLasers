import {Client, Collection} from "discord.js";

export const client = new Client();
// A list of message ID and callback pairs. You get the emote name and ID of the user reacting.
export const eventListeners: Map<string, (emote: string, id: string) => void> = new Map();
export const categories: Collection<string, string[]> = new Collection();
export const aliases: Collection<string, string> = new Collection(); // Top-level aliases only.