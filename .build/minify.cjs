const terser = require('terser');
const fs = require('fs').promises;
const { getAllFilesByExtension } = require('@knighttower/js-utility-functions/nodeUtils');


async function minifyFile(input, output, options) {
    try {
        const inputCode = await fs.readFile(input, 'utf8');
        const result = await terser.minify(inputCode, options);
        if (result.error) {
            console.error(`Error minifying ${input}: ${result.error}`);
            return;
        }
        await fs.writeFile(output, result.code, 'utf8');
        console.log(`Minified ${input} to ${output}`);
    } catch (err) {
        console.error(`Failed to minify ${input}: ${err}`);
    }
}

async function main() {
    const workingDir = process.cwd();
    const allFiles = getAllFilesByExtension(`${workingDir}/dist`, ['.js', '.mjs', '.cjs']);
    const filesToMinify = [];
    for (const file of allFiles) {
        const minifiedFile = file.replace(/(\.m?c?js)$/, '.min$1');
        filesToMinify.push({
            input: file,
            output: minifiedFile,
            options: {
                compress: true,
                mangle: true,
            },
        });
    }
    for (const { input, output, options } of filesToMinify) {
        await minifyFile(input, output, options);
    }
}

main().catch((err) => {
    console.error('Minification failed:', err);
});
