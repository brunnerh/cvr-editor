import { editorProperty } from "../../../../components/editor/properties.component";
import { NumberEditorComponent } from "../../../../components/editor/property-editors/index";
import { copyOnDefined } from "../../../utility/object-utilities";
import { addToJSON } from "../../../utility/json";

/** Type representing a time span during which something is considered active. */
export class ActivitySpanViewModel
{
	static deserialize(json: ActivitySpanViewModel): ActivitySpanViewModel
	{
		const span = new ActivitySpanViewModel();
		copyOnDefined(json)(span)("from", "to");

		return span;
	}

	/** Start time in seconds. */
	@editorProperty("From", () => NumberEditorComponent, undefined, {
		tooltip: "Start time in seconds."
	})
	from = 0;

	/** End time in seconds. */
	@editorProperty("To", () => NumberEditorComponent, undefined, {
		tooltip: "End time in seconds."
	})
	to = 3600;

	/**
	 * Gets whether the span is active for the given time.
	 * @param time Time in seconds.
	 */
	isActive(time: number)
	{
		return time >= this.from && time <= this.to;
	}
}
addToJSON(ActivitySpanViewModel.prototype, "from", "to");