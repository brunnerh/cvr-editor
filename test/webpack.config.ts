import * as webpack from "webpack";
const glob = require("glob");

const CircularDependencyPlugin = require('circular-dependency-plugin')
const nodeExternals = require('webpack-node-externals');

let plugins = [
	new CircularDependencyPlugin({
		exclude: /node_modules/,
		failOnError: true
	})
];

const config: webpack.Configuration = {
	target: "node",
	entry: glob.sync(__dirname + "/**/*.spec.ts"),
	//devtool: "",
	output: {
		path: __dirname,
		filename: "tests.js",
	},
	resolve: {
		extensions: ['.ts']
	},
	module: {
		rules: [
			{ test: /\.ts$/, loader: "ts-loader", options: { configFile: "tsconfig.test.json" } }
		]
	},
	externals: [nodeExternals({
		modulesDir: "../node_modules"
	})],
	plugins: plugins
}

module.exports = config;