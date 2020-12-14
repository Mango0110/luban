"use strict";

const shell = require("shelljs");
// https://github.com/substack/minimist [解析参数选项]
const minimist = require("minimist");
const log = require("./console");

const { getChangedPackages, exit } = require("./utils");
const { organizationName, PACKAGE_WEIGHT_LIST } = require("./constant");

const rawArgs = process.argv.slice(2);
const args = minimist(rawArgs);

let scope = [];

// node scripts/build.js --package=cli,cli-shared-utils
if (args.package) {
  scope = args.package.split(",");
}

// node scripts/build.js --onlyChanged
if (args.onlyChanged) {
  const changePackages = getChangedPackages();
  scope = changePackages;

  if (changePackages.length === 0) {
    console.log("There is no changed package to build, exiting with code 0");
    exit(0);
  }
}

/**
 *
 * @param {string[]} packages
 * @returns {string[]} 返回拼接依赖包的数组列表
 */
function getFinalScope(packages) {
  let finalScope = packages;
  if (packages.length === 0) {
    // 枚举包list 详情配置：https://github.com/lerna/lerna#getting-started

    const { stdout } = shell.exec("lerna list --all");
    finalScope = stdout
      .split("\n")
      .map((name) => name.replace(`@${organizationName}/`, ""))
      .filter((n) => !!n);
  }

  if (!finalScope.includes("cli-shared-types")) {
    finalScope.push("cli-shared-types");
  }

  // 进行包的版本赋值
  const finalScopeWeighted = {};
  finalScope.forEach((scope) => {
    finalScopeWeighted[scope] = PACKAGE_WEIGHT_LIST[scope] || 1;
  });

  // 依赖包的名称排序
  const sortedAllPackages = finalScope.sort(
    (a, b) => finalScopeWeighted[b] - finalScopeWeighted[a],
  );
  // 拼接--scope 是为了在lerna中指定当前包名 运行package.json的build
  return sortedAllPackages.map((packageName) => `--scope @${organizationName}/${packageName}`);
}

const _finalScope = getFinalScope(scope);

// 循环安装依赖包
_finalScope.forEach((scope) => {
  // 拼接 build的命令、
  const buildArgs = ["build", scope];

  // node scripts/build.js --check
  if (args.check) {
    buildArgs.shift();
    buildArgs.unshift("check:type");
  }

  // 拼接当前的名称 进行 每个依赖包的依赖安装
  const buildCommand = `lerna run ${buildArgs.join(" ")}`;
  log("green", `running build command: ${buildCommand}`);
  const { code: buildCode } = shell.exec(buildCommand);

  if (buildCode === 1) {
    console.log(`Failed: ${buildCommand}`);
    process.exit(1);
  }
});
