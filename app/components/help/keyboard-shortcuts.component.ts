import * as ng from "@angular/core";

@ng.Component({
	selector: "cvr-help-keyboard-shortcuts",
	template: `
		<div class="grid-root">
			<ng-container *ngFor="let shortcut of shortcuts">
				<div>{{ shortcut.gesture }}</div>
				<div>{{ shortcut.description }}</div>
			</ng-container>
		</div>
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
export class KeyboardShortcutsComponent
{
	constructor(@ng.Inject('shortcuts') public shortcuts: any)
	{
	}
}