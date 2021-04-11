import {strict as assert} from "assert";
import path from "path";
import {Client} from "discord.js";
import {launch} from "../src";

// TODO: Add some mockups of data structures to test against then trigger them via client.emit().

const client = new Client();
process.env.TESTENV_EXTENSION = "*.ts";
process.env.TESTENV_PATTERN = "^(?!template\\.ts)(?!modules\\/)(\\w+(?:\\/\\w+)?)(?:test\\.)?\\.ts$";
launch(client, path.join(__dirname, "commands"));

describe("A bot using this command handler...", function () {
    it("placeholder", () => {
        assert.strictEqual(1, 1);
    });
});

after(() => {
    client.destroy();
});
