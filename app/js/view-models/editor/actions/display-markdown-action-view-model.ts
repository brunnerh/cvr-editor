import { editorProperty } from "../../../../components/editor/properties.component";
import { TextDisplayComponent, MultiLineStringEditorComponent } from "../../../../components/editor/property-editors";
import { addToJSON } from "../../../utility/json";
import { ButtonViewModel } from "../button-view-model";
import { DisplayHtmlBaseActionViewModel } from "./display-html-base-action-view-model";
import { cachedGetter } from "../../../utility/decorators";
import * as showdown from "showdown";
import { SceneViewModel } from "../scene-view-model";

export class DisplayMarkdownActionViewModel extends DisplayHtmlBaseActionViewModel
{
	static deserialize(json: DisplayMarkdownActionViewModel, parent: ButtonViewModel | SceneViewModel): DisplayMarkdownActionViewModel
	{
		const action = new DisplayMarkdownActionViewModel(parent);
		super.deserializeHtmlBaseAction(action, json);
		action.markdown = json.markdown;

		return action;
	}

	readonly type = "display-markdown";

	@editorProperty(null, () => TextDisplayComponent, undefined, { sortOrder: -1 })
	readonly description = "Displays Markdown as an HTML message box.";

	@editorProperty("Markdown", () => MultiLineStringEditorComponent)
	markdown = "# Title";

	@cachedGetter((self: DisplayMarkdownActionViewModel) => [
		self.markdown
	])
	get html()
	{
		let converter = new showdown.Converter();
		return converter.makeHtml(this.markdown);
	}
}

addToJSON(DisplayMarkdownActionViewModel.prototype, "type", "markdown");