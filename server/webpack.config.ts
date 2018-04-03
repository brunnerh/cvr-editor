import * as webpack from "webpack";

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
	entry: __dirname + "/app.ts",
	//devtool: "",
	output: {
		path: __dirname,
		filename: "server.js",
	},
	resolve: {
		extensions: ['.ts', '.tsx', '.js', '.jsx']
	},
	module: {
		rules: [
			{ test: /\.ts$/, loader: "ts-loader", options: { configFile: "tsconfig.server.json" } }
		]
	},
	externals: [nodeExternals({
		modulesDir: "../node_modules"
	})],
	plugins: plugins
}

module.exports = config;