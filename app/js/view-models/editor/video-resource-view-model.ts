import { VideoResource } from "../../../../server/db-interfaces";
import { VideoSource } from "./video-source";
import { editorProperty } from "../../../components/editor/properties.component";
import { StringEditorComponent } from "../../../components/editor/property-editors/string-editor.component";
import { OptionsEditorComponent, OptionsEditorOption, PESelectOptions } from "../../../components/editor/property-editors/options-editor.component";
import { Stereoscopy } from "../../utility/user-input-interfaces";
import { DetailsType } from "./details-type";

export class VideoResourceViewModel implements VideoSource, DetailsType
{
	readonly detailsType = "resource";

	get videoSrc()
	{
		return this.entity.relPath;
	}

	//TODO: DB updates & more properties

	@editorProperty("Name", () => StringEditorComponent)
	get name() { return this.entity.name; }
	set name(value: string) { this.entity.name = value }

	@editorProperty("Stereoscopy", () => OptionsEditorComponent, [
		{
			provide: PESelectOptions, useValue: () => <OptionsEditorOption<Stereoscopy>[]>[
				{ value: "none", label: "None" },
				{ value: "horizontal", label: "Horizontal" },
				{ value: "vertical", label: "Vertical" },
			]
		}
	])
	get stereoscopy() { return this.entity.stereoscopy; }
	set stereoscopy(value: Stereoscopy) { this.entity.stereoscopy = value }

	constructor(public entity: VideoResource)
	{
	}
}