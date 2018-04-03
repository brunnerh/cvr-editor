import { editorProperty } from "../../../../components/editor/properties.component";
import { TextDisplayComponent, MultiLineStringEditorComponent } from "../../../../components/editor/property-editors";
import { addToJSON } from "../../../utility/json";
import { ButtonViewModel } from "../button-view-model";
import { DisplayHtmlBaseActionViewModel } from "./display-html-base-action-view-model";
import { SceneViewModel } from "../scene-view-model";

export class DisplayHtmlActionViewModel extends DisplayHtmlBaseActionViewModel
{
	static deserialize(json: DisplayHtmlActionViewModel, parent: ButtonViewModel | SceneViewModel): DisplayHtmlActionViewModel
	{
		const action = new DisplayHtmlActionViewModel(parent);
		super.deserializeHtmlBaseAction(action, json);
		action.html = json.html;

		return action;
	}

	readonly type = "display-html";

	@editorProperty(null, () => TextDisplayComponent, undefined, { sortOrder: -1 })
	readonly description = "Displays an HTML message box.";

	@editorProperty("HTML", () => MultiLineStringEditorComponent)
	html = "<div></div>";
}

addToJSON(DisplayHtmlActionViewModel.prototype, "type", "html");