import { Component, Input } from "@angular/core";
import * as ng from "@angular/core";

/**
 * Presents an object using a given view template.
 * 
 * Both the content object and the template are supplied as input properties. The template should use an implicit let statement to represent the content that will be used as context for the template.
 */
@Component({
	selector: 'cvr-content-presenter',
	template: `
		<ng-container #presenter></ng-container>
	`
})
export class ContentPresenterComponent<T> implements ng.OnInit
{
	@Input() content: T;

	@Input() template: ng.TemplateRef<any>;

	@ng.ViewChild('presenter', { read: ng.ViewContainerRef }) presenter: ng.ViewContainerRef;

	ngOnInit()
	{
		this.presenter.createEmbeddedView(this.template, { $implicit: this.content });
	}
}
