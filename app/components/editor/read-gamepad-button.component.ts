import * as ng from "@angular/core";
import * as mat from "@angular/material";
import { GamepadInputsService, GamepadInputConfig, ButtonPressEvent } from "../gamepad-inputs.service";
import { ShellDialogComponent } from "../utility/shell-dialog.component";

@ng.Component({
	selector: "cvr-read-gamepad-button",
	template: `
		<div>Waiting for input...</div>
	`,
	styles: [`
		.grid-root
		{
			display: grid;
			grid-template-columns: min-content auto;
			grid-template-rows: repeat(auto-fill, min-content);
			grid-row-gap: var(--grid-row-gap);
			grid-column-gap: var(--grid-column-gap);
		}
	`]
})
export class ReadGamepadButtonComponent implements ng.OnDestroy
{
	input: ButtonPressEvent;

	private inputToken: { unsubscribe(): void; }

	constructor(
		public inputsService: GamepadInputsService,
		dialogRef: mat.MatDialogRef<ShellDialogComponent>,
		@ng.Inject('config') config: GamepadInputConfig,
	)
	{
		if (config.gamepad != null)
			this.input = {
				gamepad: config.gamepad,
				button: config.button!
			};

		this.inputToken = this.inputsService.onButtonPressed.subscribe({
			next: (e: ButtonPressEvent) =>
			{
				this.input = { gamepad: e.gamepad, button: e.button };
				this.inputToken.unsubscribe();

				dialogRef.close(this);
			}
		});
	}

	ngOnDestroy()
	{
		this.inputToken.unsubscribe();
	}
}