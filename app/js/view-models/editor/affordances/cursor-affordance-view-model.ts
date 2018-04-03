import { AffordanceViewModel, AffordanceLayers, AffordanceMetadata } from "./affordance-view-model";
import { ButtonViewModel } from "../button-view-model";
import { TextDisplayComponent, NumberEditorComponent, ColorEditorComponent, PEColorOptions, ColorEditorOptions } from "../../../../components/editor/property-editors";
import { editorProperty } from "../../../../components/editor/properties.component";
import { addToJSON } from "../../../utility/json";
import { ProjectViewModel } from "../project-view-model";
import { HUD } from "../../../3d/hud";
import { copyOnDefined } from "../../../utility/object-utilities";

export class CursorAffordanceViewModel extends AffordanceViewModel
{
	static deserialize(json: CursorAffordanceViewModel, project: ProjectViewModel): CursorAffordanceViewModel
	{
		const affordance = new CursorAffordanceViewModel(project);
		copyOnDefined(json)(affordance)(
			"name",
			"enabled",
			"radiusFactor",
			"lineWidthFactor",
			"opacityDefault", "opacityHover",
			"colorOverride", "colorOverrideHover"
		);

		return affordance;
	}

	readonly type = "cursor";

	@editorProperty(null, () => TextDisplayComponent, undefined, { sortOrder: -1 })
	readonly description = "Renders a cursor and optionally changes it when hovering an element to indicate interactivity.";

	@editorProperty("Radius Factor", () => NumberEditorComponent, undefined, {
		tooltip: "Radius of cursor circle as factor of the HUD width."
	})
	radiusFactor = 0.003;
	@editorProperty("Line Width Factor", () => NumberEditorComponent, undefined, {
		tooltip: "Line width of cursor circle as factor of the HUD width."
	})
	lineWidthFactor = 0.003;

	@editorProperty("Opacity Default", () => NumberEditorComponent, undefined, {
		tooltip: "Opacity when not hovering a button."
	})
	opacityDefault = 0.5;

	@editorProperty("Opacity Hover", () => NumberEditorComponent, undefined, {
		tooltip: "Opacity when hovering a button."
	})
	opacityHover = 1.0;
	
	@editorProperty("Custom Color", () => ColorEditorComponent, [{
		provide: PEColorOptions, useValue: <ColorEditorOptions>{ nullable: true }
	}], { tooltip: "Overrides the default white color of the cursor."})
	colorOverride: string | null = null;

	@editorProperty("Custom Color Hover", () => ColorEditorComponent, [{
		provide: PEColorOptions, useValue: <ColorEditorOptions>{ nullable: true }
	}], { tooltip: "Overrides the default white color of the cursor on hover."})
	colorOverrideHover: string | null = null;

	constructor(project: ProjectViewModel)
	{
		super(project);

		this.name = `Cursor`;
	}

	/** Draws a reticle to the center of the HUD. */
	private drawReticle(hud: HUD, radius: number, lineWidth: number, style: string)
	{
		hud.draw((ctx, width, height) =>
		{
			ctx.beginPath();
			ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
			ctx.lineWidth = lineWidth;
			ctx.strokeStyle = style;
			ctx.stroke();
		});
	}

	render(buttons: ButtonViewModel[], layers: AffordanceLayers, metadata: AffordanceMetadata)
	{
		const hit = buttons.filter(btn => btn.hits(metadata.cursor, metadata.currentTime))[0];

		const colorNonHover = this.colorOverride != null ? this.colorOverride : "#FFFFFF";
		const colorHover = this.colorOverrideHover != null ? this.colorOverrideHover : colorNonHover;
		const color = hit ? colorHover : colorNonHover;

		const style = color + this.hexString(hit != null ? this.opacityHover : this.opacityDefault);
		this.drawReticle(
			layers.hud,
			layers.hud.width * this.radiusFactor,
			layers.hud.width * this.lineWidthFactor,
			style
		);
	}
}

addToJSON(
	CursorAffordanceViewModel.prototype,
	"type", "name", "enabled",
	"radiusFactor", "lineWidthFactor",
	"opacityDefault", "opacityHover",
	"colorOverride", "colorOverrideHover"
);