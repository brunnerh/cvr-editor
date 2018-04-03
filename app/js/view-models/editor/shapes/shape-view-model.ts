import { NumberEditorComponent, ListEditorComponent, PEListOptions, ListEditorOptions } from "../../../../components/editor/property-editors";
import { Point } from "../../../utility/geometry";
import { editorProperty } from "../../../../components/editor/properties.component";
import { addToJSON } from "../../../utility/json";
import { ActivitySpanViewModel } from "./activity-span-view-model";
import { copyOnDefined } from "../../../utility/object-utilities";

export abstract class ShapeViewModel
{
	static deserializeShape<T extends ShapeViewModel>(target: T, json: T)
	{
		const copy = copyOnDefined(json)(target);
		copy("sampleRate", "centerX", "centerY");
		if (json.activitySpans)
			target.activitySpans = json.activitySpans.map(s => ActivitySpanViewModel.deserialize(s));
	}

	// TODO: Use metadata to reflect the type for any instance.
	/** Gets the type of the shape, primarily used for deserialization purposes. */
	abstract readonly type: ShapeType;

	/** Gets or sets the number of points sampled from the shape's path for the projection. */
	@editorProperty("Samples", () => NumberEditorComponent, undefined, {
		tooltip: "The number of sample points used to approximate the shape. If the shape does not wrap correctly on the horizontal seam, increasing the sample size can help."
	})
	sampleRate = 100;

	/** Gets the distance between two points from which a seam transition is assumed. */
	cutThreshold = 0.95;

	/** Center of the shape on the X-Axis. Ranges from 0 to 1. */
	@editorProperty("X", () => NumberEditorComponent)
	centerX: number = 0.5;
	/** Center of the shape on the Y-Axis. Ranges from 0 to 1. */
	@editorProperty("Y", () => NumberEditorComponent)
	centerY: number = 0.5;

	@editorProperty("Activity Spans", () => ListEditorComponent, [
		{ provide: PEListOptions, useValue: () => <ListEditorOptions>{
			createItem: async () => new ActivitySpanViewModel()
		}}
	], {
		fullRow: true,
		tooltip: "Sets the times during which a shape is active. If no spans are defined the shape is always active.",
		sortOrder: 1
	})
	activitySpans: ActivitySpanViewModel[] = [];

	/**
	 * Gets the path geometry of the shape in cartesian coordinates in the range from 0 to 1.
	 * The shape may be split up into multiple paths.
	 */
	abstract getPlanarGeometry(): Point[][];

	/**
	 * Scales the shape.
	 * @param scaleDeltaX The difference in scale to add to the horizontal scale.
	 * @param scaleDeltaY The difference in scale to add to the vertical scale.
	 */
	abstract scaleRelative(scaleDeltaX: number, scaleDeltaY: number): void;

	/**
	 * Gets whether the shape is currently active.
	 * @param time The current time in seconds.
	 */
	isActive(time: number)
	{
		return this.activitySpans.length == 0 ||
			this.activitySpans.some(s => s.isActive(time));
	}
}
addToJSON(ShapeViewModel.prototype, "type", "sampleRate", "centerX", "centerY", "activitySpans");

export type ShapeType = "circle" | "rectangle";