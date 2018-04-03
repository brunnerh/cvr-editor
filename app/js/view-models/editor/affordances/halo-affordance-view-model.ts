import { AffordanceViewModel, AffordanceLayers, AffordanceMetadata } from "./affordance-view-model";
import { ButtonViewModel } from "../button-view-model";
import { TextDisplayComponent, NumberEditorComponent } from "../../../../components/editor/property-editors";
import { editorProperty } from "../../../../components/editor/properties.component";
import { addToJSON } from "../../../utility/json";
import { ProjectViewModel } from "../project-view-model";
import { uvToLatLon, toVector3, worldToLatLon, planePointsCircle, Point } from "../../../utility/geometry";
import config from "../../../../../config";

export class HaloAffordanceViewModel extends AffordanceViewModel
{
	static deserialize(json: HaloAffordanceViewModel, project: ProjectViewModel): HaloAffordanceViewModel
	{
		const affordance = new HaloAffordanceViewModel(project);
		affordance.name = json.name;
		affordance.enabled = json.enabled;
		affordance.lineWidthFactor = json.lineWidthFactor;
		affordance.radiusFactor = json.radiusFactor;
		affordance.traceSegments = json.traceSegments;
		affordance.sampleRate = json.sampleRate;

		return affordance;
	}

	readonly type = "halo";

	@editorProperty(null, () => TextDisplayComponent, undefined, { sortOrder: -1 })
	readonly description = "Renders a circle of varying radius around off-screen elements.";

	/** Gets the distance between two points from which a seam transition is assumed. */
	cutThreshold = 0.95;

	@editorProperty("Line Width Factor", () => NumberEditorComponent, undefined, {
		tooltip: "Line width of halo circle as factor of screen width."
	})
	lineWidthFactor = 0.001;


	@editorProperty("Radius Factor", () => NumberEditorComponent, undefined, {
		tooltip: "Radius of halo circle as factor of screen width."
	})
	radiusFactor = 0.01;
	
	@editorProperty("Samples", () => NumberEditorComponent, undefined, {
		tooltip: "The number of sample points used to approximate the halo. If the halo does not wrap correctly on the horizontal seam, increasing the sample size can help."
	})
	sampleRate = 100;

	@editorProperty("Trace Segments", () => NumberEditorComponent, undefined, {
		tooltip: "The number of line segments used to approximate the path to the elements which is used to find the screen edge intersection point."
	})
	traceSegments = 100;

	constructor(project: ProjectViewModel)
	{
		super(project);

		this.name = `Halos`;
	}

	render(buttons: ButtonViewModel[], layers: AffordanceLayers, metadata: AffordanceMetadata)
	{
		const currentButtons = this.buttonsWithActiveShapes(buttons, metadata.currentTime);
		const perspectiveFrustum = this.makeFrustum(metadata.cameras.perspective);

		const cursorLatLon = uvToLatLon(metadata.cursor);
		currentButtons.forEach(data =>
		{
			const btnCenter = data.button.getCenter(metadata.currentTime);
			if (btnCenter == null)
				return;

			const btnLatLon = uvToLatLon(btnCenter);

			// Only consider buttons that are off-screen.
			let btnWorld = this.toWorldPosition(btnCenter, layers.interaction.radius);
			if (perspectiveFrustum.containsPoint(toVector3(btnWorld)))
				return;
			
			// Calculate 3D path and intersect it with HUD frustum to find edge points to calculate the radius of the halo.
			const path = this.planarSpherePath(cursorLatLon, btnLatLon, this.traceSegments, this.cutThreshold);
			const intersection = this.intersectPathWithFrustum(perspectiveFrustum, path, layers);
			if (intersection == null)
			{
				// This should not happen but rounding errors and the horizontal seam could cause this anyway.
				if (config.debug)
					console.warn("No intersection found for button.", data.button);

				return;
			}

			const intersectionLatLon = worldToLatLon(intersection);
			/** Distance from button to frustum. */
			const distance = btnLatLon.distanceTo(intersectionLatLon, 1);
			layers.interaction.draw((ctx, width, height) => {
				const radius = distance + this.radiusFactor;
				const circle = { cx: btnCenter.u, cy: btnCenter.v, r: radius };
				const paths = planePointsCircle(circle, this.sampleRate, this.cutThreshold);
				const map = (point: Point) => ({
					x: point.x * width,
					y: point.y * height
				});
				paths.forEach(path =>
				{
					ctx.save();
					ctx.beginPath();
					ctx.strokeStyle = metadata.colors.secondary + "88";
					ctx.lineWidth = width * this.lineWidthFactor;
					path.forEach((p, i) =>
					{
						const mapped = map(p);
						if (i == 0)
							ctx.moveTo(mapped.x, mapped.y);
						else
							ctx.lineTo(mapped.x, mapped.y);
					});
					ctx.stroke();
					ctx.restore();
				});
			})
		});
	}
}

addToJSON(HaloAffordanceViewModel.prototype, "type", "name", "enabled", "lineWidthFactor", "radiusFactor", "sampleRate", "traceSegments");