import {Client, Collection} from "discord.js";

export const client = new Client();
// A list of message ID and callback pairs. You get the emote name and ID of the user reacting.
export const eventListeners = new Map<string, (emote: string, id: string) => void>();
export const categories = new Collection<string, string[]>();
export const aliases = new Collection<string, string>(); // Top-level aliases only.