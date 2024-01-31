const { runCommand } = require('@knighttower/js-utility-functions/nodeUtils');
const bumpVersion = require('@knighttower/js-utility-functions/nodeUtils/BumpVersion.cjs');
const workingDir = process.cwd();



runCommand(`npx tsc -p "${workingDir}/tsconfig.json"`);
runCommand(`npx rollup -c "${workingDir}/.build/rollup.config.cjs"`);
runCommand(`npx webpack --config "${workingDir}/.build/webpack.config.cjs"`);
runCommand(`node "${workingDir}/.build/minify.cjs"`);
bumpVersion.exe();
