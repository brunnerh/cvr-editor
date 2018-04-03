//import "core-js";
import '@angular/core';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import * as c from './components';
import * as ec from './components/editor/property-editors';
// Material
import * as m from '@angular/material';
import { FormsModule } from '@angular/forms';
// Other
import { DndModule } from "ng2-dnd";

const editors = [
	ec.RecursiveEditorComponent, ec.ListEditorComponent,
	ec.StringEditorComponent, ec.NumberEditorComponent,
	ec.OptionsEditorComponent, ec.BooleanEditorComponent,
	ec.ColorEditorComponent,
	ec.MultiLineStringEditorComponent,
	ec.TextDisplayComponent,
];

@NgModule({
	imports: [
		BrowserModule, BrowserAnimationsModule, FormsModule,

		m.MatButtonModule, m.MatListModule, m.MatExpansionModule, m.MatToolbarModule, m.MatMenuModule,
		m.MatIconModule, m.MatSnackBarModule, m.MatDialogModule,
		m.MatFormFieldModule, m.MatInputModule, m.MatSliderModule,
		m.MatButtonToggleModule, m.MatCheckboxModule, m.MatSelectModule,
		m.MatTabsModule,

		DndModule.forRoot(),
	],
	declarations: [
		// Components
		c.ContentPresenterComponent, c.RenameComponent, c.ShellDialogComponent, c.ListViewComponent,
		c.MenuItemComponent, c.FancyDialogContentComponent, c.VideoProxyComponent,

		c.IndexComponent, c.AppComponent, c.EditorComponent,
		c.ProjectComponent, c.PropertiesComponent, c.TimelineComponent,
		c.ViewerComponent, c.SceneEditorComponent,

		...editors,

		c.InputConfigureComponent, c.ReadGamepadButtonComponent,
		c.SelectOptionComponent,
		c.DataTrackingComponent,

		c.HelpComponent, c.KeyboardShortcutsComponent,

		// Directives
		c.InjectComponentDirective,
	],
	bootstrap: [c.AppComponent],
	providers: [
		c.DBService, ec.VideoResourceOptionsProvider, c.CommandsService,
		c.KeyboardShortcutsService, c.FancyDialogsService, c.VRDisplaysService,
		c.GamepadInputsService, c.DataTrackingService,

		// Provide various global variables as injectables
		{ provide: 'window', useValue: window },
		{ provide: 'navigator', useValue: navigator },
		{ provide: 'document', useValue: document },
		{ provide: 'location', useValue: location },
		{ provide: 'fetch', useValue: { fetch: fetch.bind(window) } },
		{ provide: 'storage', useValue: localStorage }
	],
	entryComponents: [
		c.RenameComponent, c.ShellDialogComponent, c.FancyDialogContentComponent,

		c.InputConfigureComponent, c.ReadGamepadButtonComponent,
		c.SelectOptionComponent,
		c.DataTrackingComponent,

		c.HelpComponent, c.KeyboardShortcutsComponent,
		
		...editors,
	]
})
export class AppModule
{

}