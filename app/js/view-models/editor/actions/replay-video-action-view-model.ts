import { ActionViewModel } from "./action-view-model";
import { cachedGetter } from "../../../utility/decorators";
import { DelegateCommand } from "../../../utility/command";
import { ViewerComponent } from "../../../../components/editor/viewer.component";
import { editorProperty } from "../../../../components/editor/properties.component";
import { TextDisplayComponent } from "../../../../components/editor/property-editors/index";
import { ButtonViewModel } from "../button-view-model";
import { SceneViewModel } from "../scene-view-model";
import { addToJSON } from "../../../utility/json";

export class ReplayVideoActionViewModel extends ActionViewModel
{
	static deserialize(_json: ReplayVideoActionViewModel, parent: ButtonViewModel | SceneViewModel): ReplayVideoActionViewModel
	{
		const action = new ReplayVideoActionViewModel(parent);
		// Currently no properties.

		return action;
	}

	readonly type = "replay-video";

	@editorProperty(null, () => TextDisplayComponent)
	readonly description = "Seeks to the beginning of the video and plays it.";

	@cachedGetter()
	get command()
	{
		return new DelegateCommand((viewer: ViewerComponent) =>
		{
			viewer.video.currentTime = 0;
			if (viewer.video.paused)
				viewer.video.play();
		});
	}
}

addToJSON(ReplayVideoActionViewModel.prototype, "type");