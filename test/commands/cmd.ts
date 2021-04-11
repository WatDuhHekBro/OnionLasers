import {NamedCommand} from "../../src";

export default new NamedCommand({
    async run({send}) {
        send("asdf");
    }
});
