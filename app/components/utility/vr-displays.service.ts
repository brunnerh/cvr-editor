import * as ng from "@angular/core";

/** OBSOLETE - Provides access to VR displays. */
@ng.Injectable()
export class VRDisplaysService
{
	private _displays: VRDisplay[] = [];
	get displays(): ReadonlyArray<VRDisplay> { return this._displays; }

	constructor(
		@ng.Inject('window') window: Window,
	)
	{
		window.addEventListener("vrdisplayconnect", (e: Event & { display: VRDisplay }) =>
		{
			this._displays.push(e.display);
		});
		window.addEventListener("vrdisplaydisconnect", (e: Event & { display: VRDisplay }) =>
		{
			const index = this._displays.indexOf(e.display);
			if (index >= 0)
				this._displays.splice(index, 1);
		});
	}
}