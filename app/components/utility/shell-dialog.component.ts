import * as ng from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material";
import { ComponentInjectionDescriptor, InjectComponentDirective } from "./inject-component.directive";

/**
 * Class for a generic dialog. Values required by the content component need to be injected via
 * the injector property of the component descriptor (see {@link ShellDialogComponentData}).
 * 
 * If OK is clicked the injected component instance is returned by the dialog. On cancel null is returned.
 * If the dialog is closed explicitly via a {@link mat.MatDialogRef}, the convention of passing the content component
 * or null should be maintained.
 * @example
 *	dialog.open(ShellDialogComponent, {
 *		data: <ShellDialogComponentData>{
 *			title: "My Dialog",
 *			component: { factory: factoryResolver.resolveComponentFactory(MyContentComponent) }
 *		}
 *	});
 */
@ng.Component({
	selector: 'cvr-utility-shell-dialog',
	template: `
		<h1 mat-dialog-title *ngIf="data.title != null">{{ data.title }}</h1>
		<form #form="ngForm">
			<div mat-dialog-content>
				<ng-container [inject-component]="data.component()"></ng-container>
			</div>

			<div mat-dialog-actions class="flex-container">
				<button *ngIf="data.hasOK"
						type="submit" mat-button (click)="onOKClick($event)" tabindex="0"
						[disabled]="form.invalid">OK</button>
				<button *ngIf="data.hasCancel"
					mat-button (click)="onCancelClick()" tabindex="0">Cancel</button>
			</div>
		</form>
	`,
	styles: [`
		[mat-dialog-actions]
		{
			justify-content: flex-end;
		}
	`]
})
export class ShellDialogComponent
{
	@ng.ViewChild(InjectComponentDirective) injectedComponentDirective: InjectComponentDirective;

	constructor(
		public dialogRef: MatDialogRef<ShellDialogComponent>,
		@ng.Inject(MAT_DIALOG_DATA) public data: ShellDialogComponentData
	)
	{
		if (data.hasCancel == null)
			data.hasCancel = false;
		if (data.hasOK == null)
			data.hasOK = true;
	}

	onOKClick(e: Event): void
	{
		e.preventDefault();

		this.dialogRef.close(this.injectedComponentDirective.component!.instance);
	}
	onCancelClick(): void
	{
		this.dialogRef.close(null);
	}
}

export interface ShellDialogComponentData
{
	/** Dialog title, if any. */
	title?: string;

	/** Gets or sets a value indicating whether the dialog has an OK button. Default: true. */
	hasOK?: boolean;

	/** Gets or sets a value indicating whether the dialog has a cancel button. Default: false. */
	hasCancel?: boolean;

	/** The component to display (deferred to allow injection of dialog reference). */
	component: () => ComponentInjectionDescriptor;
}