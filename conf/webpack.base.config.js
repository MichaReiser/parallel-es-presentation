var path = require("path");
var webpack = require("webpack");
var Config = require("webpack-config").Config;
var ParallelEsPlugin = require("parallel-es-webpack-plugin");

module.exports = new Config().merge({
    entry: {
        "example": "./src/index.ts",
        "benchmark": "./src/benchmark.ts"
    },
    output: {
        path: path.resolve(__dirname, "../dist"),
        filename: "[name].js"
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: path.resolve("./src/transpiled"),
                loader: "babel-loader!awesome-typescript-loader"
            },
            {
                test: /\.ts$/,
                include: path.resolve("./src/transpiled"),
                loader: `babel-loader?${JSON.stringify({"plugins": [ "parallel-es"] })}!awesome-typescript-loader`
            },
            {
                test: /parallel.*\.js/,
                include: path.resolve(require.resolve("parallel-es"), "../"),
                loader: "source-map-loader"
            }
        ],
        noParse: [
            /benchmark\/benchmark\.js/
        ]
    },
    resolve: {
        extensions: [".webpack.js", ".web.js", ".ts", ".js"],
        modules:[
              path.join(__dirname, "../node_modules")
        ]
    },
    plugins: [
        new ParallelEsPlugin({
            babelOptions: {
                "presets": [
                    ["es2015", { "modules": false }]
                ]
            }
        })
    ]
});
