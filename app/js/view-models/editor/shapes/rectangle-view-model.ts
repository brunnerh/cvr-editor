import { NumberEditorComponent, TextDisplayComponent } from "../../../../components/editor/property-editors";
import { editorProperty } from "../../../../components/editor/properties.component";
import { ShapeViewModel } from "./shape-view-model";
import { cachedGetter } from "../../../utility/decorators";
import { addToJSON } from "../../../utility/json";
import { Point, latLonToUV, uvToXY, splitAndCap, radToDeg } from "../../../utility/geometry";
import { LatLonSpherical } from "geodesy";

export class RectangleViewModel extends ShapeViewModel
{
	static deserialize(json: RectangleViewModel) : RectangleViewModel
	{
		const circle = new RectangleViewModel();
		super.deserializeShape(circle, json);
		circle.width = json.width;
		circle.height = json.height;
		circle.angle = json.angle;

		return circle;
	}

	readonly type = "rectangle";

	@editorProperty(null, () => TextDisplayComponent, undefined, { sortOrder: -1 })
	readonly description = "A rectangular shape.";

	@editorProperty("Width", () => NumberEditorComponent)
	width: number = 0.1;
	@editorProperty("Height", () => NumberEditorComponent)
	height: number = 0.1;
	@editorProperty("Angle [deg]", () => NumberEditorComponent)
	angle: number = 0;

	/** Gets points mapped onto unit plane. */
	@cachedGetter<RectangleViewModel>(self => [
		self.centerX,
		self.centerY,
		self.width,
		self.height,
		self.angle,
		self.sampleRate
	])
	private get planePoints(): Point[][]
	{
		const latlon = (x: number, y: number) => new LatLonSpherical(y * 180 - 90, x * 360 - 180);
		const hw = this.width / 2;
		const hh = this.height / 2;
		const center = latlon(this.centerX, this.centerY);
		const angle = Math.atan2(this.width, this.height);
		const distance = Math.sqrt(hw * hw + hh + hh);
		// TODO: These calculations are probably wrong, replace with a more generic algorithm
		const cornerPoint = (rads: number) =>
			center.destinationPoint(distance, radToDeg(rads) + this.angle, 1);
		const c1 = cornerPoint(-angle);
		const c2 = cornerPoint(angle);
		const c3 = cornerPoint(-angle - Math.PI);
		const c4 = cornerPoint(angle + Math.PI);
		const sides: [LatLonSpherical, LatLonSpherical][] = [
			[c1, c2],
			[c2, c3],
			[c3, c4],
			[c4, c1],
		]
		const stepsPerSide = Math.round(this.sampleRate / 4);
		const points: LatLonSpherical[] = [];
		for (let [ start, end ] of sides)
		{
			points.push(start);
			const distance = start.distanceTo(end, 1);
			const step = distance / stepsPerSide;
			for (var i = 0; i < stepsPerSide; i++)
			{
				const current = points[points.length - 1];
				const bearing = current.bearingTo(end);
				const point = current.destinationPoint(step, bearing, 1);
				points.push(point);
			}
		}
	
		return splitAndCap(points.map(x => uvToXY(latLonToUV(x))), this.cutThreshold);
	}

	getPlanarGeometry(): Point[][]
	{
		return this.planePoints;
	}

	scaleRelative(scaleDeltaX: number, scaleDeltaY: number)
	{
		this.width *= (1 + scaleDeltaX);
		this.height *= (1 - scaleDeltaY);
	}
}

addToJSON(RectangleViewModel.prototype, "width", "height", "angle");