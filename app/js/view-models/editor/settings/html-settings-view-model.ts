import { SettingsViewModel } from "./settings-view-model";
import { addToJSON } from "../../../utility/json";
import { ProjectViewModel } from "../project-view-model";
import { editorProperty } from "../../../../components/editor/properties.component";
import { TextDisplayComponent, MultiLineStringEditorComponent } from "../../../../components/editor/property-editors/index";
import { copyOnDefined } from "../../../utility/object-utilities";

export class HtmlSettingsViewModel extends SettingsViewModel
{
	static deserialize(json: HtmlSettingsViewModel, project: ProjectViewModel): HtmlSettingsViewModel
	{
		const settings = new HtmlSettingsViewModel(project);
		const copy = copyOnDefined(json)(settings);
		copy("css");

		return settings;
	}

	readonly type = "html";

	@editorProperty(null, () => TextDisplayComponent)
	description = `These settings pertain to the HTML displayed in the messages created from the respective actions "Display HTML" and "Display Markdown".`

	@editorProperty("Global CSS", () => MultiLineStringEditorComponent, undefined, {
		tooltip: `CSS that is supplied to all messages. ".root" matches the root element around the message contents.`
	})
	css = `.root
{
	background: #333;
	color: #EEE;
	width: 100%;
	height: 100%;
	position: absolute;
	padding: 5px;
}`;

	constructor(project: ProjectViewModel)
	{
		super(project);

		this.name = `HTML`;
	}
}

addToJSON(HtmlSettingsViewModel.prototype,
	"type", "css");