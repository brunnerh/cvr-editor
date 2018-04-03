import config from "../config";
import { VideoResource, LokiRecord, RecordUpdateData } from "./db-interfaces";

if (config.debug)
{
	process.env.DEBUG = "express:*";
}

import * as express from "express";
import * as path from "path";
import * as fs from "fs";
import { promisify } from "util"; // Node 8+
import * as fileUpload from "express-fileupload";
import { UploadedFile } from "express-fileupload";
import * as loki from "lokijs";
import * as compression from "compression";
import * as bodyParser from "body-parser";
const lokiFsAdapter = require("../node_modules/lokijs/src/loki-fs-structured-adapter");

const port = process.argv[2] == null ? "8080" : process.argv[2];
const app = express();

app.use(compression());
app.use(bodyParser());

/** Root of project. */
const rootDir = process.cwd();
/** Root of app as served via express. */
const rootDirApp = path.join(rootDir, "./app");

/** Creates directories along a path. */
const createPath = (targetDir: string) =>
{
	const sep = path.sep;
	const initDir = path.isAbsolute(targetDir) ? sep : '';
	targetDir.split(sep).reduce((parentDir, childDir) =>
	{
		const curDir = path.resolve(parentDir, childDir);
		if (fs.existsSync(curDir) == false)
			fs.mkdirSync(curDir);

		return curDir;
	}, initDir);
};

// DB setup
const adapter = new lokiFsAdapter();

let videoResources: LokiCollection<VideoResource>;
const dbLoaded = (db: Loki) =>
{
	videoResources = db.getCollection<VideoResource>("video-resources");
	if (videoResources === null)
		videoResources = db.addCollection("video-resources");

	const videoResourcesPublic = videoResources.addDynamicView("public");
	videoResourcesPublic.applySimpleSort('name');
}
const db: Loki = new loki('cvr.db', {
	adapter: adapter,
	autoload: true,
	autoloadCallback: () => dbLoaded(db),
	autosave: true,
	autosaveInterval: 4000
});

/** Copy a list of properties from an object to a new object. */
const mapProperties = <T>(record: T, ...properties: (keyof T)[]) =>
{
	const result = <any>{};
	for (const key of properties)
		result[key] = record[key];

	return result;
}

const mapVideoResourcePublic = (vr: VideoResource) => mapProperties(vr, "$loki", "name", "timestamp", "relPath", "stereoscopy");
const videoResourcesPublic = () => videoResources.getDynamicView("public").data().map(mapVideoResourcePublic);

app.use(fileUpload());

const indexInsertionPointString = "<!-- [CONTENT] -->";
const readFile = promisify(fs.readFile);
/* Sets up a handler that injects HTML for a component element into the shell. */
const componentHandler = (componentName: string) =>
	async (_req: express.Request, res: express.Response) =>
	{
		let page = await readFile(path.join(rootDir, "/app/index.html"), { encoding: "utf8" });
		const i = page.indexOf(indexInsertionPointString);
		page = page.substring(0, i) + `<${componentName}></${componentName}>` + page.substring(i + indexInsertionPointString.length);

		if (config.debug)
			// Set mode to trigger production mode in Angular as necessary.
			page = page.replace('data-mode="release"', 'data-mode="debug"');

		res.send(page);
	};

// (This is redundant because Angular kills all static contents of the bootstrapped element.)
app.route("/").get((_req, res) => res.redirect("/editor"));
app.route("/editor").get(componentHandler("cvr-editor"));

// API
const dirs = {
	resources: {
		videos: '/app/resources/videos/'
	}
}
/** Maps collection names as used in routing to collection instances. */
const collections: { [key: string]: LokiCollection<LokiRecord> } = {
	get videos() { return videoResources }
}
createPath(path.join(rootDir, dirs.resources.videos));

// Route that allows generic updates to records in a given collection.
app.route("/editor/:collection/update").post(async (req, res) =>
{
	try
	{
		const collection = collections[req.params.collection];
		const { id, key, value } = <RecordUpdateData>req.body;

		const resource = collection.findOne(<LokiRecord>{
			$loki: id
		});
		(<any>resource)[key] = value;
		collection.update(resource);

		res.status(200).send();
	}
	catch (e)
	{
		res.status(500).send(`Could not update record (${e}).`);
	}
});

app.route("/editor/videos").get((_req, res) =>
{
	res.send(videoResourcesPublic());
});
app.route("/editor/videos").delete(async (req, res) =>
{
	try
	{
		const id = <number>req.body.id;
		const resource = videoResources.findOne(<VideoResource>{
			$loki: id
		});
		videoResources.remove(resource);

		await promisify(fs.unlink)(resource.absPath);

		res.status(200).send();
	}
	catch (e)
	{
		res.status(500).send(`Could not delete video (${e}).`);
	}
});
app.route("/editor/videos").post(async (req, res) =>
{
	if (!req.files)
	{
		res.status(400).send('No files were uploaded.');
		return;
	}

	const file = <UploadedFile>req.files.file;

	if (file.mimetype.startsWith("video/") == false)
	{
		res.status(500).send(`File had incorrect MIME type (${file.mimetype}).`);
		return;
	}

	let targetPath = path.join(rootDir, dirs.resources.videos, file.name);
	const timestamp = new Date();
	while (await promisify(fs.exists)(targetPath))
	{
		console.log("File conflict:", targetPath);
		const parts = path.parse(targetPath);
		delete parts.base; // Otherwise this is used instead of name + ext
		parts.name += "." + timestamp.toISOString().replace(/:/g, "-");
		targetPath = path.format(parts);
	}
	file.mv(targetPath, err =>
	{
		if (err)
		{
			res.status(500).send(err);
			return;
		}

		const record = videoResources.insert({
			name: file.name,
			timestamp: timestamp.toISOString(),
			absPath: targetPath,
			relPath: "/" + path.relative(rootDirApp, targetPath),
			stereoscopy: "none"
		});

		res.send(mapVideoResourcePublic(record));
	});
});

const maxAge = process.env.DEBUG ? 0 : (1000 /*s*/ * 3600 /*h*/ * 24 /*d*/ * 365);
let staticDir = (dir: string) => express.static(path.join(rootDir, dir), { maxAge });
app.use("/", staticDir("./app"));

app.listen(port, () =>
{
	console.log(`Listening on port ${port}.`);
	console.log(`http://localhost:${port}/`);
});