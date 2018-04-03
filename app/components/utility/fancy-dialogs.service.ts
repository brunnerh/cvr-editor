import * as ng from "@angular/core";
import * as mat from "@angular/material";
import { ShellDialogComponent, ShellDialogComponentData } from "./shell-dialog.component";

/** Provides Material dialogs based versions of confirm, alert and prompt. */
@ng.Injectable()
export class FancyDialogsService
{
	constructor(
		private dialog: mat.MatDialog,
		private injector: ng.Injector,
		private factoryResolver: ng.ComponentFactoryResolver
	)
	{

	}
	async confirm(message?: string) : Promise<boolean>
	{
		const result = await this.showDialog(true, {
			message: message
		});

		return result != null;
	}
	async alert(message?: any) : Promise<void>
	{
		await this.showDialog(true, {
			message: message
		});
	}
	async prompt(message?: string, _default?: string) : Promise<string | null>
	{
		const data = <FancyDialogContentComponentData>{
			message: message,
			requestsInput: true,
			input: _default
		};
		const result = await this.showDialog(true, data);

		return result == null ? null : data.input!;
	}

	private async showDialog(hasCancel: boolean, data: FancyDialogContentComponentData)
	{
		const dialogRef = this.dialog.open(ShellDialogComponent, {
			data: <ShellDialogComponentData>{
				hasCancel: hasCancel,
				component: () => ({
					factory: this.factoryResolver.resolveComponentFactory(FancyDialogContentComponent),
					injector: ng.Injector.create([
						{ provide: 'data', useValue: data }
					], this.injector)
				})
			}
		});

		return await dialogRef.afterClosed().toPromise<FancyDialogContentComponent | null>();
	}
}

@ng.Component({
	selector: "cvr-utility-fancy-dialog-content",
	template: `
		<div *ngIf="data.requestsInput == false">
			<div *ngIf="data.message">{{ data.message }}</div>
		</div>
		<div *ngIf="data.requestsInput">
			<mat-form-field>
				<input matInput tabindex="0"
					placeholder="{{ data.message }}" [(ngModel)]="data.input"
					name="input"/>
			</mat-form-field>
		</div>
	`
})
export class FancyDialogContentComponent
{
	constructor(@ng.Inject("data") public data: FancyDialogContentComponentData)
	{
		if (data.requestsInput == null)
			data.requestsInput = false;

		if (data.requestsInput && data.input == null)
			data.input = "";
	}
}

interface FancyDialogContentComponentData
{
	message?: string;

	requestsInput?: boolean;

	input?: string;
}