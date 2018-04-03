import { AffordanceViewModel, AffordanceLayers, AffordanceMetadata } from "./affordance-view-model";
import { ButtonViewModel } from "../button-view-model";
import { TextDisplayComponent, NumberEditorComponent, ColorEditorComponent, PEColorOptions, ColorEditorOptions } from "../../../../components/editor/property-editors";
import { editorProperty } from "../../../../components/editor/properties.component";
import { addToJSON } from "../../../utility/json";
import { ProjectViewModel } from "../project-view-model";
import { Point } from "../../../utility/geometry";
import { copyOnDefined } from "../../../utility/object-utilities";

export class ShapeAffordanceViewModel extends AffordanceViewModel
{
	static deserialize(json: ShapeAffordanceViewModel, project: ProjectViewModel): ShapeAffordanceViewModel
	{
		const affordance = new ShapeAffordanceViewModel(project);
		const copy = copyOnDefined(json)(affordance);
		copy(
			"name",
			"enabled",
			"fillOpacityDefault", "fillOpacityHover",
			"borderThicknessFactor",
			"borderOpacityDefault", "borderOpacityHover",
			"colorOverride", "colorOverrideHover"
		);

		return affordance;
	}

	readonly type = "shape";

	@editorProperty(null, () => TextDisplayComponent, undefined, { sortOrder: -1 })
	readonly description = "Displays the shape of an element in the view.";

	@editorProperty("Fill Opacity Default", () => NumberEditorComponent, undefined, {
		tooltip: "Fill opacity when not hovering the button."
	})
	fillOpacityDefault = 0.10;

	@editorProperty("Fill Opacity Hover", () => NumberEditorComponent, undefined, {
		tooltip: "Fill opacity when hovering the button."
	})
	fillOpacityHover = 0.20;

	@editorProperty("Border Thickness Factor", () => NumberEditorComponent, undefined, {
		tooltip: "Border thickness of button as factor of sphere circumference."
	})
	borderThicknessFactor = 0.001;

	@editorProperty("Border Opacity Default", () => NumberEditorComponent, undefined, {
		tooltip: "Border opacity when not hovering the button."
	})
	borderOpacityDefault = 0.5;

	@editorProperty("Border Opacity Hover", () => NumberEditorComponent, undefined, {
		tooltip: "Border opacity when hovering the button."
	})
	borderOpacityHover = 1;

	@editorProperty("Custom Color", () => ColorEditorComponent, [{
		provide: PEColorOptions, useValue: <ColorEditorOptions>{ nullable: true }
	}], { tooltip: "Overrides the default orange color of the shapes."})
	colorOverride: string | null = null;

	@editorProperty("Custom Color Hover", () => ColorEditorComponent, [{
		provide: PEColorOptions, useValue: <ColorEditorOptions>{ nullable: true }
	}], { tooltip: "Overrides the default orange color of the shapes on hover."})
	colorOverrideHover: string | null = null;

	constructor(project: ProjectViewModel)
	{
		super(project);

		this.name = `Shapes`;
	}

	render(buttons: ButtonViewModel[], layers: AffordanceLayers, metadata: AffordanceMetadata)
	{
		const currentButtons = this.buttonsWithActiveShapes(buttons, metadata.currentTime);
		layers.interaction.draw((ctx, width, height) =>
		{
			const map = (point: Point) => ({
				x: point.x * width,
				y: point.y * height
			});
			currentButtons.forEach(data =>
			{
				const button = data.button;
				const hit = button.hits(metadata.cursor, metadata.currentTime);
				const colorNonHover = this.colorOverride != null ? this.colorOverride : metadata.colors.primary;
				const colorHover = this.colorOverrideHover != null ? this.colorOverrideHover : colorNonHover;
				const color = hit ? colorHover : colorNonHover;
				data.shapes.forEach(shape =>
				{
					const paths = shape.getPlanarGeometry();
					paths.forEach(path =>
					{
						ctx.save();
						ctx.beginPath();
						ctx.lineWidth = this.borderThicknessFactor * width;
						ctx.strokeStyle = color + this.hexString(hit ? this.borderOpacityHover : this.borderOpacityDefault);
						ctx.fillStyle = color + this.hexString(hit ? this.fillOpacityHover : this.fillOpacityDefault);
						path.forEach((p, i) =>
						{
							const mapped = map(p);
							if (i == 0)
								ctx.moveTo(mapped.x, mapped.y);
							else
								ctx.lineTo(mapped.x, mapped.y);
						});
						// If single segment shape, close shape.
						if (paths.length == 1)
							ctx.closePath();
						ctx.stroke();
						ctx.fill();
						ctx.restore();
					});
				});
			});
		});
	}
}

addToJSON(ShapeAffordanceViewModel.prototype,
	"type",
	"name",
	"enabled",
	"fillOpacityDefault", "fillOpacityHover",
	"borderThicknessFactor",
	"borderOpacityDefault", "borderOpacityHover",
	"colorOverride", "colorOverrideHover"
);