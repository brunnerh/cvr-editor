import { NumberEditorComponent, TextDisplayComponent } from "../../../../components/editor/property-editors";
import { editorProperty } from "../../../../components/editor/properties.component";
import { ShapeViewModel } from "./shape-view-model";
import { cachedGetter } from "../../../utility/decorators";
import { addToJSON } from "../../../utility/json";
import { Point, planePointsCircle } from "../../../utility/geometry";

export class CircleViewModel extends ShapeViewModel
{
	static deserialize(json: CircleViewModel) : CircleViewModel
	{
		const circle = new CircleViewModel();
		super.deserializeShape(circle, json);
		circle.radius = json.radius;

		return circle;
	}

	readonly type = "circle";

	@editorProperty(null, () => TextDisplayComponent, undefined, { sortOrder: -1 })
	readonly description = "A circular shape.";

	@editorProperty("Radius", () => NumberEditorComponent)
	radius: number = 0.1;

	/** Gets points mapped onto unit plane. */
	@cachedGetter<CircleViewModel>(self => [
		self.centerX,
		self.centerY,
		self.radius,
		self.sampleRate
	])
	private get planePoints(): Point[][]
	{
		return planePointsCircle({ cx: this.centerX, cy: this.centerY, r: this.radius }, this.sampleRate, this.cutThreshold);
	}

	getPlanarGeometry(): Point[][]
	{
		return this.planePoints;
	}

	scaleRelative(scaleDeltaX: number, scaleDeltaY: number)
	{
		this.radius *= (1 + (scaleDeltaX - scaleDeltaY));
	}
}

addToJSON(CircleViewModel.prototype, "radius");