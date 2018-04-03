import { ActionViewModel } from "./action-view-model";
import { cachedGetter } from "../../../utility/decorators";
import { DelegateCommand } from "../../../utility/command";
import { ViewerComponent } from "../../../../components/editor/viewer.component";
import { editorProperty } from "../../../../components/editor/properties.component";
import { TextDisplayComponent } from "../../../../components/editor/property-editors/index";
import { addToJSON } from "../../../utility/json";

export class DoNothingActionViewModel extends ActionViewModel
{
	readonly type = "do-nothing";

	@editorProperty(null, () => TextDisplayComponent)
	readonly description = "Do nothing.";

	@cachedGetter()
	get command()
	{
		return new DelegateCommand((_viewer: ViewerComponent) => { });
	}
}

addToJSON(DoNothingActionViewModel.prototype, "type");