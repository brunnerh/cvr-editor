import "zone.js";
import "hammerjs";
import "@angular/cdk";
import "@angular/material";

import { ɵELEMENT_PROBE_PROVIDERS } from "@angular/platform-browser";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";
import { AppModule } from "./app.module";
import { enableProdMode } from "@angular/core";


document.addEventListener("DOMContentLoaded", () =>
{
	if (document.documentElement.dataset.mode == "release")
		enableProdMode();

	platformBrowserDynamic().bootstrapModule(AppModule, { providers: [ɵELEMENT_PROBE_PROVIDERS] });
});

require('./styles/site.less');
require('./styles/flex.less');
require('./styles/grid.less');
require('./styles/material-compact.less');
require('./styles/material-icons.less');
require('./styles/theme.scss');
require('./styles/properties-editor.less')

require("../node_modules/ng2-dnd/bundles/style.css");