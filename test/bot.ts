import {strict as assert} from "assert";
import {Client} from "discord.js";
import {launch} from "../src";
import path from "path";

// TODO: Add some mockups of data structures to test against then trigger them via client.emit().

const client = new Client({
    intents: []
});

launch(client, path.join(__dirname, "commands"), {
    getPrefix: () => "$",
    useTSExtension: true
});

describe("A bot using this command handler...", function () {
    it("placeholder", () => {
        assert.strictEqual(1, 1);
    });
});

after(() => {
    client.destroy();
});
