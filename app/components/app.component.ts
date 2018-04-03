import { Component, Inject } from '@angular/core';

@Component({
	selector: 'body',
	// Because Angular is an opinionated piece of junk that does not allow parsing of static content.
	// TODO: Use Angular routing.
	template: `
		<ng-container [ngSwitch]="location.pathname">
			<cvr-index *ngSwitchCase="'/'"></cvr-index>
			<cvr-editor *ngSwitchCase="'/editor'"></cvr-editor>
		</ng-container>
	`
})
export class AppComponent 
{
	constructor(
		@Inject('location') public location: Location,
	)
	{
	}
}