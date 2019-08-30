const path = require('path');
const webpack = require('webpack');
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CompressionPlugin = require('compression-webpack-plugin');
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
    mode: "production",
    entry: './src_shop/app.js',
    output: {
        path: path.resolve(__dirname, '/home/vflingerie.com/docs/dist'),
        filename: 'bundle.js'
    },
     optimization: {
            minimizer: [
        new TerserPlugin({
          cache: true,
          parallel: true,
          sourceMap: true
        }),
        new OptimizeCSSAssetsPlugin({}),
        ],
   },
    plugins: [
        new MiniCssExtractPlugin({
            // both options are optional
            filename: "[name].css",
            chunkFilename: "[id].css"
        }),
        new CompressionPlugin({
            test: /\.js(\?.*)?$/i,
            filename: '[path].gz[query]',
            algorithm: 'gzip'
        })
    ],
    module: {
        rules: [{
            test: /\.(sa|sc|c)ss$/,
            use: [{
                    loader: MiniCssExtractPlugin.loader,
                    options: {
                        // you can specify a publicPath here
                        // by default it use publicPath in webpackOptions.output
                        publicPath: '../',
                        minimize: true
                    }
                },
                'css-loader',
                'sass-loader',
            ]
        },
        {
        test: /\.js$/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  modules: false,
                  useBuiltIns: false,
                  targets: {
                    browsers: [
                      'Chrome >= 60',
                      'Safari >= 9.1',
                      'iOS >= 8.3',
                      'Firefox >= 54',
                      'Edge >= 15',
                    ],
                  },
                }],
              ],
            },
          },
        }
        ]
    }
};
