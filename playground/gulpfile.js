// gulp files have to be local to the directory or it'll delete <root>/dist instead of <root>/.../dist.
const gulp = require("gulp");
const del = require("del");
gulp.task("default", () => del(["dist/**/*"]));
