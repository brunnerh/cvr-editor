import * as ng from "@angular/core"
import { DBService } from "../../db.service"
import { cachedGetter } from "../../../js/utility/decorators"
import { OptionsEditorOption, OptionProvider } from "./options-editor.component";
import { VideoResourceViewModel } from "../../../js/view-models/editor/video-resource-view-model";

/**
 * Provides the list of available video resources for use in a select element.
 */
@ng.Injectable()
export class VideoResourceOptionsProvider implements OptionProvider<VideoResourceViewModel>
{
	@cachedGetter<VideoResourceOptionsProvider>(self => self.db.videoResources)
	get options(): OptionsEditorOption<VideoResourceViewModel>[]
	{
		return this.db.videoResources.map(v => ({
			label: v.name,
			value: v
		}));
	}

	constructor(private db: DBService)
	{

	}
}