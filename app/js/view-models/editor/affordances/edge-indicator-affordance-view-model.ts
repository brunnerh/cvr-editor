import { AffordanceViewModel, AffordanceLayers, AffordanceMetadata } from "./affordance-view-model";
import { ButtonViewModel } from "../button-view-model";
import { TextDisplayComponent, NumberEditorComponent, BooleanEditorComponent } from "../../../../components/editor/property-editors";
import { editorProperty } from "../../../../components/editor/properties.component";
import { addToJSON } from "../../../utility/json";
import { ProjectViewModel } from "../project-view-model";
import { uvToLatLon, toVector3 } from "../../../utility/geometry";
import config from "../../../../../config";

export class EdgeIndicatorAffordanceViewModel extends AffordanceViewModel
{
	static deserialize(json: EdgeIndicatorAffordanceViewModel, project: ProjectViewModel): EdgeIndicatorAffordanceViewModel
	{
		const affordance = new EdgeIndicatorAffordanceViewModel(project);
		affordance.name = json.name;
		affordance.enabled = json.enabled;
		affordance.radiusFactor = json.radiusFactor;
		affordance.radiusDynamicityFactor = json.radiusDynamicityFactor;
		affordance.opacityMax = json.opacityMax;
		affordance.opacityMin = json.opacityMin;
		affordance.traceSegments = json.traceSegments;
		affordance.traceDraw = json.traceDraw;

		return affordance;
	}

	readonly type = "edge-indicator";

	@editorProperty(null, () => TextDisplayComponent, undefined, { sortOrder: -1 })
	readonly description = "Renders a circle of varying radius and opacity at the viewport edge indicating off-screen elements.";

	/** Gets the distance between two points from which a seam transition is assumed. */
	cutThreshold = 0.95;


	@editorProperty("Radius Factor", () => NumberEditorComponent, undefined, {
		tooltip: "Radius of indicator as factor of screen width."
	})
	radiusFactor = 0.05;


	@editorProperty("Radius Dyn. Factor", () => NumberEditorComponent, undefined, {
		tooltip: "Factor of dynamic change of the indicator radius based on distance."
	})
	radiusDynamicityFactor = 0;

	@editorProperty("Opacity Max.", () => NumberEditorComponent, undefined, {
		tooltip: "Maximum opacity of indicators based on distance."
	})
	opacityMax = 0.8;
	@editorProperty("Opacity Min.", () => NumberEditorComponent, undefined, {
		tooltip: "Minimum opacity of indicators based on distance."
	})
	opacityMin = 0.8;

	@editorProperty("Trace Segments", () => NumberEditorComponent, undefined, {
		tooltip: "The number of line segments used to approximate the path to the elements which is used to find the screen edge intersection point."
	})
	traceSegments = 100;

	@editorProperty("Draw Trace", () => BooleanEditorComponent, undefined, {
		tooltip: "Whether to draw the trace line."
	})
	traceDraw = false;

	constructor(project: ProjectViewModel)
	{
		super(project);

		this.name = `Edge Indicators`;
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

			/** Distance normalized to range [0, 1]. */
			const distance = btnLatLon.distanceTo(cursorLatLon, 1) / Math.PI;

			// Only consider buttons that are off-screen.
			let btnWorld = this.toWorldPosition(btnCenter, layers.interaction.radius);
			if (perspectiveFrustum.containsPoint(toVector3(btnWorld)))
				return;

			// Calculate 3D path and intersect it with HUD frustum to find edge points at which to draw.
			const path = this.planarSpherePath(cursorLatLon, btnLatLon, this.traceSegments, this.cutThreshold);

			if (this.traceDraw)
				layers.interaction.draw((ctx, width, height) =>
				{
					path.map(seg => seg.map(p => ({ x: p.x * width, y: p.y * height })))
						.forEach(seg =>
						{
							ctx.beginPath();
							seg.forEach((p, i) =>
							{
								if (i == 0)
									ctx.moveTo(p.x, p.y);
								else
									ctx.lineTo(p.x, p.y);
							});
							ctx.lineWidth = 2;
							ctx.strokeStyle = "#FFFFFFFF";
							ctx.stroke();
						});
				});

			const intersection = this.intersectPathWithFrustum(perspectiveFrustum, path, layers);

			if (intersection == null)
			{
				// This should not happen but rounding errors and the horizontal seam could cause this anyway.
				if (config.debug)
					console.warn("No intersection found for button.", data.button);

				return;
			}

			layers.hud.draw((ctx, width, height) =>
			{
				const position = this.toScreenPosition(intersection, metadata.cameras.perspective, width, height);
				const radius = (1 + distance * this.radiusDynamicityFactor) * (this.radiusFactor * width);
				const opacity = ((this.opacityMax - this.opacityMin) * (1 - distance) + this.opacityMin);

				ctx.beginPath();
				ctx.arc(position.x, position.y, radius, 0, Math.PI * 2)
				ctx.fillStyle = metadata.colors.secondary + this.hexString(opacity);
				ctx.fill();
			});
		});
	}
}

addToJSON(
	EdgeIndicatorAffordanceViewModel.prototype,
	"type", "name", "enabled", "radiusFactor", "radiusDynamicityFactor", "opacityMax", "opacityMin", "traceSegments", "traceDraw"
);