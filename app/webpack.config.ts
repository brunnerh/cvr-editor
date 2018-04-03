import * as webpack from "webpack";

const ExtractTextPlugin = require("extract-text-webpack-plugin");
const CircularDependencyPlugin = require('circular-dependency-plugin')
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
import globalConfig from "./../config";

// Loops are acceptable if the files do not immediately execute code that references the imports.
/** List of files that may be part of a loop. i.e.
 * A -> B -> A or
 * B -> A -> B
 */
let allowedDirectLoops: [string, string][]  = [
	["js/view-models/editor/actions/action-utility.ts", "js/view-models/editor/actions/composite-action-view-model.ts"]
];

type CycleDetectionArgs = { module: webpack.Module, paths: string[], compilation: any };
let plugins = [
	new ExtractTextPlugin("styles.css"),
	new CircularDependencyPlugin({
		exclude: /node_modules/,
		failOnError: true,
		onDetected: (args: CycleDetectionArgs) =>
		{
			const { paths, compilation } = args;

			// Ignore node module cycles.
			if (paths[0].startsWith("../node_modules"))
				return;

			// Check for allowed cycles.
			if (paths.length == 3 &&
				paths[0] == paths[2] &&
				allowedDirectLoops.some(([a, b]) =>
					paths[0] == a && paths[1] == b ||
					paths[0] == b && paths[1] == a
				)
			)
				return;

			compilation.errors.push(new Error("Cycle detected: " + paths.join(' -> ')));
		}
	})
];

if (globalConfig.debug == false)
	plugins.push(
		// Code currently relies on various names, so no mangling.
		new UglifyJsPlugin({
			uglifyOptions: {
				mangle: {
					keep_classnames: true,
					keep_fnames: true,
				},
				keep_classnames: true,
				keep_fnames: true,
			}
		})
	);

const extract = (...loaders: string[]) => ExtractTextPlugin.extract(
	{
		fallback: "style-loader",
		use: loaders.map(l => `${l}-loader`).join("!")
	});

const config: webpack.Configuration = {
	entry: __dirname + "/main.ts",
	//devtool: "",
	output: {
		path: __dirname,
		filename: "bundle.js",
	},
	resolve: {
		extensions: ['.ts', '.tsx', '.js', '.jsx', '.html', '.less']
	},
	module: {
		rules: [
			{ test: /\.ts$/, loader: "ts-loader", options: { configFile: "tsconfig.app.json" } },

			// Extract global style sheets
			{ test: /\.css$/, use: extract("css") },
			{ test: /\.less$/, exclude: /\.component.less$/, use: extract("css", "less") },
			{ test: /\.scss$/, exclude: /\.component.scss$/, use: extract("css", "sass") },

			// Inline component HTML/styles
			{ test: /\.component.less$/, loader: "raw-loader!less-loader" },
			{ test: /\.component.scss$/, loader: "raw-loader!sass-loader" },
			{ test: /\.component.html$/, loader: "raw-loader" },

			// Embed fonts as Base64
			{ test: /\.(eot|svg|ttf|woff|woff2)$/, loader: "base64-inline-loader" },
		]
	},
	plugins: plugins
}

module.exports = config;