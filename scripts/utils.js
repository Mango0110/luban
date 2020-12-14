"use strict";

const shell = require("shelljs");

module.exports = {
  /**
   * @name 对比当前的分支改动范围
   * @info ['packagesd的任何目录的src和cli-shared-types的dist下面的所有文件']
   * @returns {string[]} 更改的目录文件名称
   */
  getChangedPackages() {
    const { stdout } = shell.exec(
      "git diff HEAD --stat --compact-summary -- ./packages/**/**/src/** -- ./packages/**/cli-shared-types/dist/**",
    );
    const changedFiles = stdout.split("\n");

    const changePackagesList = new Set();

    changedFiles.forEach((fileName) => {
      if (/(cli|cli-plugin-)/.test(fileName)) {
        const matchedResult = fileName.match(/\/cli-?(\w|-){0,20}\//);
        if (Array.isArray(matchedResult)) {
          const matchedPackageName = matchedResult[0];
          changePackagesList.add(matchedPackageName.replace(/\//g, ""));
        }
      }
    });

    return Array.from(changePackagesList);
  },

  /**
   *
   * @see https://github.com/cowboy/node-exit
   * @param {number} exitCode
   * @param {*} streams
   */
  exit(exitCode, streams) {
    if (!streams) {
      streams = [process.stdout, process.stderr];
    }
    console.log(streams);

    var drainCount = 0;

    function tryToExit() {
      if (drainCount === streams.length) {
        process.exit(exitCode);
      }
    }

    streams.forEach(function(stream) {
      // Count drained streams now, but monitor non-drained streams.
      if (stream.bufferSize === 0) {
        drainCount++;
      } else {
        stream.write("", "utf-8", function() {
          drainCount++;
          tryToExit();
        });
      }
      stream.write = function() {};
    });

    tryToExit();

    process.on("exit", function() {
      process.exit(exitCode);
    });
  },
};
