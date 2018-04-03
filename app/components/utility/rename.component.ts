import * as ng from "@angular/core";

@ng.Component({
	selector: 'cvr-utility-rename',
	template: `
		<mat-form-field [color]="'accent'">
			<input matInput tabindex="0"
				placeholder="Name" [(ngModel)]="name"
				name="name" required/>
		</mat-form-field>
	`
})
export class RenameComponent
{
	constructor(@ng.Inject("name") public name: string)
	{

	}
}

// TODO: Validation of form fields is not linked with shell-dialog form.