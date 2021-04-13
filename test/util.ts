import {strict as assert} from "assert";
import {parseVars} from "../src/util";

describe("Utility Functions", () => {
    describe("parseVars()", () => {
        it("should leave an empty string unchanged", () => {
            assert.strictEqual(parseVars("", {}), "");
        });

        it("should leave a normal string unchanged", () => {
            assert.strictEqual(
                parseVars("According to all known laws of aviation...", {}),
                "According to all known laws of aviation..."
            );
        });

        it("should replace invalid variables with an empty string by default", () => {
            assert.strictEqual(
                parseVars("According to all known laws of %topic%...", {}),
                "According to all known laws of ..."
            );
        });

        it("should replace invalid variables with a custom specifier if defined", () => {
            assert.strictEqual(
                parseVars("According to all known laws of %topic%...", {}, "N/A"),
                "According to all known laws of N/A..."
            );
        });

        it("should replace invalid variables with the original token if null is given", () => {
            assert.strictEqual(
                parseVars("According to all known laws of %topic%...", {}, null),
                "According to all known laws of %topic%..."
            );
        });

        it("should replace valid variables with the specified token", () => {
            assert.strictEqual(
                parseVars("According to all known laws of %topic%...", {topic: "thermodynamics"}, null),
                "According to all known laws of thermodynamics..."
            );
        });

        it("should replace double percent signs with escaped percent signs", () => {
            assert.strictEqual(
                parseVars("According to all known laws of %topic%%%...", {topic: "thermodynamics"}, null),
                "According to all known laws of thermodynamics%..."
            );
        });
    });
});
