const buble = require('@rollup/plugin-buble');
const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const babel = require('@rollup/plugin-babel');
const path = require('path');

const workingDir = process.cwd();
const { targets, rollupFormats } = require(`${workingDir}/.build/source-files.cjs`);

const formats = rollupFormats ?? [
    { type: 'amd', ext: 'js' },
    { type: 'cjs', ext: 'cjs' },
    { type: 'umd', ext: 'js' },
    { type: 'iife', ext: 'js' },
    { type: 'system', ext: 'js' },
    { type: 'esm', ext: 'mjs' },
];

/**
 * Builds a configuration object for the rollup build process.
 *
 * @param {object} options - The options for the build configuration.
 * @param {string} options.file - The input file name.
 * @param {string} options.format - The output format (e.g., 'umd', 'cjs').
 * @param {boolean} [options.transpile=true] - Whether to transpile the code into ES5 files
 * @param {string} [options.exportType='default'] - The export type ('default', 'named', etc.).
 * @param {string} [options.exportExt='js'] - The extension for the output file.
 * @returns {object} The configuration object for the rollup build process.
 */
function buildConfig({ file, format, exportType = 'default', exportExt = 'js', transpile = false }) {
    if (!file || !format) {
        throw new Error('Missing required parameters: file and format');
    }

    const fileName = file.split('.')[0];
    const fileOutput = `${fileName}.${exportExt}`;
    const plugins = [resolve()];

    if (transpile) {
        plugins.push(buble());
        plugins.push(
            babel({
                babelHelpers: 'bundled',
                exclude: 'node_modules/**',
            }),
        );
    }

    if (format === 'esm') {
        plugins.push(commonjs());
    }

    return {
        input: path.resolve(`${workingDir}/src/${file}`),
        output: {
            name: fileName,
            format,
            file: path.resolve(`${workingDir}/dist/${format}/${fileOutput}`),
            exports: exportType,
        },
        plugins,
    };
}

function getAllConfigs() {
    const configs = [];
    targets.forEach((target) => {
        // Generate multiple configurations
        for (const format of formats) {
            configs.push(
                buildConfig({
                    file: target.file,
                    format: format.type,
                    exportType: target.exportType,
                    exportExt: format.ext,
                    transpile: target.transpile ?? false,
                }),
            );
        }
    });
    return configs;
}

const configs = getAllConfigs();

module.exports = configs;
