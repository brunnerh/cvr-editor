import { SettingsViewModel } from "./settings-view-model";
import { addToJSON } from "../../../utility/json";
import { ProjectViewModel } from "../project-view-model";
import { editorProperty } from "../../../../components/editor/properties.component";
import { BooleanEditorComponent, NumberEditorComponent } from "../../../../components/editor/property-editors/index";
import { copyOnDefined } from "../../../utility/object-utilities";
import { EventEmitter } from "@angular/core";
import { notify } from "../../../utility/ng-notify";

export class ViewportSettingsViewModel extends SettingsViewModel
{
	static deserialize(json: ViewportSettingsViewModel, project: ProjectViewModel): ViewportSettingsViewModel
	{
		const settings = new ViewportSettingsViewModel(project);
		const copy = copyOnDefined(json)(settings);
		copy("showHud", "isViewportRound", "effectiveFov", "removeBrowserView", "shiftHud");
		if (json.manualHudShift)
			settings.manualHudShift = HudShiftViewModel.deserialize(json.manualHudShift);

		return settings;
	}

	readonly type = "viewport";

	readonly showHudChange = new EventEmitter<boolean>();
	@notify()
	@editorProperty("Show HUD", () => BooleanEditorComponent, undefined, {
		tooltip: "Shows the HUD."
	})
	showHud = true;

	// @editorProperty("Round Viewport", () => BooleanEditorComponent, undefined, {
	// 	tooltip: "Set this option if the device used leads to a round viewport perception."
	// })
	isViewportRound = true; // TODO: implement transformations & comment in decorator

	// TODO: Do not scale the hud, but make the collision frustum more narrow, so e.g. edge indicators are further in, but not cut off at the middle.
	/** Effective field of view in degrees. */
	@editorProperty("Effective FOV", () => NumberEditorComponent, undefined, {
		tooltip: "The VR device may cut off a certain amount of the rendered view which may lead to affordances being out of view. "
			+ "Use this setting to compensate for this. A value of \"-1\" means no changes will be made. Only applies in VR."
	})
	effectiveFov = -1;

	@editorProperty("Remove Browser View", () => BooleanEditorComponent, undefined, {
		tooltip: "Sets whether the view in the browser is removed when presenting in an external VR device. "
				+ "May be required depending on browser."
	})
	removeBrowserView = false;

	@editorProperty("Shift HUD", () => BooleanEditorComponent, undefined, {
		tooltip: "Sets whether the HUD should be shifted according to the eye projection matrices. "
				+ "This can cause issues with stereoscopy so it should usually be turned off."
	})
	shiftHud = false;

	// @editorProperty("Manual HUD Shift", () => RecursiveEditorComponent, undefined, {
	// 	fullRow: true,
	// 	tooltip: "Shifts the HUD by the given amount. This shift is not symmetric and can be used to account for manufacturing inaccuracies and "
	// 			+ "flaws in the VR device."
	// })
	manualHudShift = new HudShiftViewModel(); // TODO: incorporate into hit testing logic (has to be correctly proportional to the shift of the HUD plane) & comment in decorator

	constructor(project: ProjectViewModel)
	{
		super(project);

		this.name = `Viewport`;
	}
}

addToJSON(ViewportSettingsViewModel.prototype,
	"type", "showHud", "isViewportRound", "effectiveFov", "removeBrowserView", "shiftHud", "manualHudShift");

export class HudShiftViewModel
{
	static deserialize(json: HudShiftViewModel)
	{
		const shift = new HudShiftViewModel();
		return copyOnDefined(json)(shift)("x", "y");
	}

	@editorProperty("X", () => NumberEditorComponent, undefined, {
		tooltip: "Shift on the X axis as percentage of width."
	})
	x = 0;
	@editorProperty("Y", () => NumberEditorComponent, undefined, {
		tooltip: "Shift on the Y axis as percentage of width."
	})
	y = 0;
}

addToJSON(HudShiftViewModel.prototype, "x", "y");