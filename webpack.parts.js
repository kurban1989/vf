const OptimizeCSSAssetsPlugin = require(
    "optimize-css-assets-webpack-plugin"
);
const cssnano = require("cssnano");

exports.minifyCSS = ({ options }) => ({
    plugins: [
        new OptimizeCSSAssetsPlugin({
            cssProcessor: cssnano,
            cssProcessorOptions: options,
            canPrint: false,
        }),
    ],
});