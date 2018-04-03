import * as ng from "@angular/core";
import * as mat from "@angular/material";
import { GamepadInputsService, GamepadInputConfig } from "../gamepad-inputs.service";
import { ShellDialogComponent, ShellDialogComponentData } from "../utility/shell-dialog.component";
import { ReadGamepadButtonComponent } from "./read-gamepad-button.component";

@ng.Component({
	selector: "cvr-input-configure",
	template: `
		<div class="grid-root">
			<ng-container *ngFor="let config of inputsService.configs; $index as i">
				<div>{{ config.label }}:</div>
				<label for="cfg_e_{{i}}" [attr.title]="configTooltip(config)">{{ configText(config) }}</label>
				<button id="cfg_e_{{i}}" mat-icon-button (click)="configSet(config)">
					<mat-icon>mode_edit</mat-icon>
				</button>
				<button mat-icon-button (click)="configReset(config)">
					<mat-icon>delete</mat-icon>
				</button>
			</ng-container>
		</div>
	`,
	styles: [`
		.grid-root
		{
			display: grid;
			grid-template-columns: min-content auto min-content min-content;
			grid-template-rows: repeat(auto-fill, min-content);
			grid-row-gap: var(--grid-row-gap);
			grid-column-gap: var(--grid-column-gap);
			align-items: center;
		}
	`]
})
export class InputConfigureComponent
{
	constructor(
		public inputsService: GamepadInputsService,
		private injector: ng.Injector,
		private dialog: mat.MatDialog,
		private componentFactoryResolver: ng.ComponentFactoryResolver

	)
	{
	}

	configText(config: GamepadInputConfig)
	{
		if (config.gamepad == null)
			return "Unset";

		return `Button ${config.button!}`;
	}
	configTooltip(config: GamepadInputConfig)
	{
		if (config.gamepad == null)
			return undefined;

		return config.gamepad;
	}

	async configSet(config: GamepadInputConfig)
	{
		const dialogRef: mat.MatDialogRef<ShellDialogComponent> = this.dialog.open(ShellDialogComponent, {
			data: <ShellDialogComponentData>{
				title: "Change Button",
				hasCancel: true,
				hasOK: false,
				component: () => ({
					factory: this.componentFactoryResolver.resolveComponentFactory(ReadGamepadButtonComponent),
					injector: ng.Injector.create([
						{ provide: "config", useValue: config },
						// Injecting dialog ref because otherwise it resolves to the current dialog, rather than the read-button dialog.
						{ provide: mat.MatDialogRef, useValue: dialogRef }
					], this.injector)
				})
			}
		});

		const result = await dialogRef.afterClosed().toPromise<ReadGamepadButtonComponent | null>();
		if (result == null)
			return;
		config.gamepad = result.input.gamepad;
		config.button = result.input.button;
	}

	configReset(config: GamepadInputConfig)
	{
		config.gamepad = null;
		config.button = null;
	}
}