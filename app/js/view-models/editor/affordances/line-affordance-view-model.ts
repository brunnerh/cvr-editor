import { AffordanceViewModel, AffordanceLayers, AffordanceMetadata } from "./affordance-view-model";
import { ButtonViewModel } from "../button-view-model";
import { TextDisplayComponent, NumberEditorComponent } from "../../../../components/editor/property-editors";
import { editorProperty } from "../../../../components/editor/properties.component";
import { addToJSON } from "../../../utility/json";
import { ProjectViewModel } from "../project-view-model";
import { uvToLatLon, toVector3 } from "../../../utility/geometry";
import { Frustum, Matrix4 } from "three";
const colorutil = require("color-util");

export class LineAffordanceViewModel extends AffordanceViewModel
{
	static deserialize(json: LineAffordanceViewModel, project: ProjectViewModel): LineAffordanceViewModel
	{
		const affordance = new LineAffordanceViewModel(project);
		affordance.name = json.name;
		affordance.enabled = json.enabled;
		affordance.lineWidthFactor = json.lineWidthFactor;
		affordance.lineSegments = json.lineSegments;
		affordance.range = json.range;

		return affordance;
	}

	readonly type = "line";

	@editorProperty(null, () => TextDisplayComponent, undefined, { sortOrder: -1 })
	readonly description = "Renders a line from the center to off-screen elements.";

	/** Gets the distance between two points from which a seam transition is assumed. */
	cutThreshold = 0.95;

	@editorProperty("Line Width Factor", () => NumberEditorComponent, undefined, {
		tooltip: "Line width of cursor circle as factor of sphere circumference."
	})
	lineWidthFactor = 0.003;

	@editorProperty("Line Segments", () => NumberEditorComponent, undefined, {
		tooltip: "The number of line segments used to approximate the lines to the elements."
	})
	lineSegments = 100;


	@editorProperty("Range", () => NumberEditorComponent, undefined, {
		tooltip: "How far the lines are drawn in percent (0 to 1). '1' means they are drawn completely from element to the screen center."
	})
	range = 1;

	constructor(project: ProjectViewModel)
	{
		super(project);

		this.name = `Lines`;
	}

	render(buttons: ButtonViewModel[], layers: AffordanceLayers, metadata: AffordanceMetadata)
	{
		const currentButtons = this.buttonsWithActiveShapes(buttons, metadata.currentTime);

		const withAlpha = (color: string, a: number) =>
			colorutil.color({ ...colorutil.color(color).rgb, a: a }).rgb;

		const gradient = colorutil.rgb.gradient({
			width: 1,
			colors: [
				{ x: 0, ...withAlpha(metadata.colors.secondary, 128) },
				{ x: this.range, ...withAlpha(metadata.colors.secondary, 0) },
			],
		});

		const cam = metadata.cameras.perspective;
		const frustum = new Frustum().setFromMatrix(
			new Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)
		);

		const cursorLatLon = uvToLatLon(metadata.cursor);
		currentButtons.forEach(data =>
		{
			const btnCenter = data.button.getCenter(metadata.currentTime);
			if (btnCenter == null)
				return;

			const btnLatLon = uvToLatLon(btnCenter);

			// Only consider buttons that are off-screen.
			let btnWorld = this.toWorldPosition(btnCenter, layers.interaction.radius);

			// (Debug) Output calculated button coordinates
			// layers.interaction.draw((ctx, width, height) =>
			// {
			// 	const r = (x: number) => Math.round(x * 100) / 100;
			// 	ctx.font = "32px serif";
			// 	ctx.fillStyle = "#ffffffAA";
			// 	ctx.textAlign = "center";
			// 	ctx.fillText(JSON.stringify({ x: r(x), y: r(y), z: r(z) }),
			// 		btnCenter.u * width,
			// 		btnCenter.v * height
			// 	);
			// })

			if (frustum.containsPoint(toVector3(btnWorld)))
				return;

			const segments = this.planarSpherePath(btnLatLon, cursorLatLon, this.lineSegments, this.cutThreshold);

			// Calculate gradient segments
			const segCount = segments.map(s => s.length).reduce((a, b) => a + b);
			const segFraction = 1 / segCount;
			const gradients = new Array(segCount).fill(0).map((_e, i) =>
			{

				const start = segFraction * i;
				const end = start + segFraction;

				return [
					colorutil.color(gradient(start, 0)).cssrgba,
					colorutil.color(gradient(end, 0)).cssrgba
				];
			})

			// Draw lines
			layers.interaction.draw((ctx, width, height) =>
			{
				ctx.save();
				ctx.lineWidth = this.lineWidthFactor * width;
				let totalSegmentIndex = -1;
				segments.forEach(seg =>
				{
					seg.map(p => ({ x: p.x * width, y: p.y * height }))
						.forEach((p, i, arr) =>
						{
							totalSegmentIndex++;

							if (i == 0)
								return;

							const grad = ctx.createLinearGradient(arr[i - 1].x, arr[i - 1].y, p.x, p.y);
							const gradSegment = gradients[totalSegmentIndex];
							grad.addColorStop(0, gradSegment[0]);
							grad.addColorStop(1, gradSegment[1]);
							ctx.strokeStyle = grad;

							ctx.beginPath()
							ctx.moveTo(arr[i - 1].x, arr[i - 1].y);
							ctx.lineTo(p.x, p.y);
							ctx.stroke();
						});
				})
				ctx.restore();
			});
		})
	}
}

addToJSON(LineAffordanceViewModel.prototype, "type", "name", "enabled", "lineWidthFactor", "lineSegments", "range");