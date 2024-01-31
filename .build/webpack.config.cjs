const path = require('path');
const workingDir = process.cwd();
const { targets, webpackFormats } = require(`${workingDir}/.build/source-files.cjs`);

const formats = webpackFormats ?? [
    { type: 'umd', dir: 'umd', ext: 'js' },
    { type: 'commonjs2', dir: 'cjs', ext: 'cjs' },
    { type: 'window', dir: 'browser', ext: 'js' },
];
/**
 * Generates a Webpack configuration for a given library name and target.
 *
 * @param {string} fileSrc - The file source.
 * @param {string} target - The target name.
 * @param {string} dir - The directory name.
 * @param {string} libraryTarget - The library target format.
 * @param {string} ext - The file extension.
 * @returns {Object} - The Webpack configuration.
 */
const getWebpackConfig = (fileSrc, fileName, libraryTarget, dir, ext, exportName) => ({
    mode: 'production',
    entry: `${workingDir}/src/${fileSrc}`,
    resolve: {
        modules: [
            'node_modules',
            path.resolve(__dirname, 'src'),
            path.resolve(__dirname, `${workingDir}/src`),
            path.resolve(__dirname, `${workingDir}/node_modules`),
        ],
        extensions: ['.mjs', '.js', '.json', '.cjs'],
    },
    output: {
        path: path.resolve(__dirname, `${workingDir}/dist/${dir}`),
        filename: `${fileName}.${ext}`,
        library: exportName,
        libraryTarget: libraryTarget,
        umdNamedDefine: true,
    },
    stats: 'errors-only',
});

// Generate multiple configurations
function getAllConfigs() {
    const configs = [];
    targets.forEach((target) => {
        // Generate multiple configurations
        for (const format of formats) {
            configs.push(getWebpackConfig(target.file, target.file.split('.')[0], format.type, format.dir, format.ext, target.exportName));
        }
    });
    return configs;
}

const configs = getAllConfigs();

module.exports = configs;
