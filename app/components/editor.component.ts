import * as ng from "@angular/core";
import * as mat from "@angular/material";
import { Component } from '@angular/core';
import { ProjectViewModel } from "../js/view-models";
import { MenuItemViewModel } from "../js/view-models/utility/menu-item-view-model";
import { ToggleMenuItemViewModel } from "../js/view-models/utility/toggle-menu-item-view-model";
import { DelegateCommand } from "../js/utility/command";
import { CommandsService } from "./commands.service";
import { KeyboardShortcutsService } from "./keyboard-shortcuts.service";
import { notification } from "../js/utility/snackbar-notification";
import { DBService } from "./db.service";
import { fileUpload, readText } from "../js/utility/file-utility";
import { ShellDialogComponent, ShellDialogComponentData } from "./utility/shell-dialog.component";
import { HelpComponent } from "./help/help.component";
import { KeyboardShortcutsComponent } from "./help/keyboard-shortcuts.component";
import { FancyDialogsService } from "./utility/fancy-dialogs.service";
import { ProjectComponent } from "./editor/project.component";
import { InputConfigureComponent } from "./editor/input-configure.component";
import { DataTrackingComponent } from "./editor/data-tracking.component";
import { notify } from "../js/utility/ng-notify";

@Component({
	selector: 'cvr-editor',
	template: require("./editor.component.html"),
	styles: [require("./editor.component.less")]
})
export class EditorComponent implements ng.OnInit
{
	@ng.ViewChild(ProjectComponent) projectComponent: ProjectComponent;

	@ng.ViewChild('video', { read: ng.ElementRef }) videoRef: ng.ElementRef;

	get video(): HTMLVideoElement { return this.videoRef.nativeElement; }

	/** Sets visibility of various view elements. */
	view: ViewSettings = {
		projectSidebar: true,
		propertiesSidebar: true,
		timeline: true,
		samples: false
	};

	modeChange = new ng.EventEmitter<"editor" | "viewer">();
	@notify()
	mode: "editor" | "viewer" = "editor";

	get isFullscreen()
	{
		return (this.document.fullscreenElement ||
			this.document.webkitFullscreenElement ||
			(<any>this.document).mozFullScreenElement ||
			(<any>this.document).msFullscreenElement) != null;
	};
	project = new ProjectViewModel();

	mainMenu: MenuItemViewModel<any>[];

	private readonly projectStorageKey = "cvr.project";

	constructor(
		//@ng.Inject('window') private window: Window,
		@ng.Inject('document') private document: Document,
		@ng.Inject("storage") storage: Storage,
		commandsService: CommandsService,
		keyboardShortcutsService: KeyboardShortcutsService,
		snackbar: mat.MatSnackBar,
		dialog: mat.MatDialog,
		factoryResolver: ng.ComponentFactoryResolver,
		injector: ng.Injector,
		db: DBService,
		fancyDialogs: FancyDialogsService
	)
	{
		// Load view settings & set up storage hooks
		const viewSettingsKey = "cvr.view";
		const viewSettingsJson = storage.getItem(viewSettingsKey);
		if (viewSettingsJson != null)
		{
			this.view = JSON.parse(viewSettingsJson);
		}
		this.view = new Proxy(this.view, {
			set(target: any, key, value, _receiver)
			{
				target[key] = value;
				storage.setItem(viewSettingsKey, JSON.stringify(target));

				return true;
			}
		});

		const newCommand = new DelegateCommand(async () =>
		{
			if (await fancyDialogs.confirm("All unsaved changes will be lost. Are you sure?") == false)
				return;

			this.project = new ProjectViewModel();
			this.projectComponent.inspectedItem = null;
			this.mode = "editor";
		});

		const saveCommand = new DelegateCommand(() =>
		{
			storage.setItem(this.projectStorageKey, JSON.stringify(this.project));

			notification(snackbar, "Saved project.");
		});

		const saveAsCommand = new DelegateCommand(() =>
		{
			const json = JSON.stringify(this.project);

			var element = this.document.createElement('a');
			element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(json));
			element.setAttribute('download', `CVR Project ${new Date().toLocaleString()}.json`);
			element.style.display = 'none';
			element.click();
		});

		const openCommand = new DelegateCommand(async () =>
		{
			const file = await fileUpload("application/json");
			const text = await readText(file);
			const json = JSON.parse(text);

			this.projectComponent.inspectedItem = null;
			this.project = ProjectViewModel.deserialize(json, db.videoResources);
			this.autoSelectScene();
		});

		const inputConfigureCommand = new DelegateCommand(() =>
		{
			dialog.open(ShellDialogComponent, {
				data: <ShellDialogComponentData>{
					title: "Configure Input",
					component: () => ({ factory: factoryResolver.resolveComponentFactory(InputConfigureComponent) })
				}
			});
		});
		const dataTrackingDialogCommand = new DelegateCommand(() =>
		{
			dialog.open(ShellDialogComponent, {
				data: <ShellDialogComponentData>{
					title: "Data Tracking",
					component: () => ({ factory: factoryResolver.resolveComponentFactory(DataTrackingComponent) })
				}
			});
		});

		const viewToggleProject = new ToggleMenuItemViewModel("Project/Resources Sidebar", "editor.view.project");
		viewToggleProject.isChecked = this.view.projectSidebar;
		const viewToggleProperties = new ToggleMenuItemViewModel("Properties Sidebar", "editor.view.properties");
		viewToggleProperties.isChecked = this.view.propertiesSidebar;
		const viewToggleTimeline = new ToggleMenuItemViewModel("Timeline", "editor.view.timeline");
		viewToggleTimeline.isChecked = this.view.timeline;
		const viewToggleSamples = new ToggleMenuItemViewModel("Shape Samples", "editor.view.samples");
		viewToggleSamples.isChecked = this.view.samples;

		// Update local values on toggle.
		viewToggleProject.isCheckedChange.asObservable().subscribe(n => this.view.projectSidebar = n);
		viewToggleProperties.isCheckedChange.asObservable().subscribe(n => this.view.propertiesSidebar = n);
		viewToggleTimeline.isCheckedChange.asObservable().subscribe(n => this.view.timeline = n);
		viewToggleSamples.isCheckedChange.asObservable().subscribe(n => this.view.samples = n);

		const usageHelpCommand = new DelegateCommand(async () =>
		{
			dialog.open(ShellDialogComponent, {
				data: <ShellDialogComponentData>{
					title: "CVR Editor Usage Help",
					component: () => ({ factory: factoryResolver.resolveComponentFactory(HelpComponent) })
				}
			});
		});

		const keyboardShortcutsCommand = new DelegateCommand(() =>
		{
			const shortcuts = keyboardShortcutsService.getShortcuts().map(sc =>
			{
				const c = commandsService.getCommand(sc.command)!;

				return {
					gesture: sc.gesture,
					description: c.description ? c.description : c.name
				};
			});

			dialog.open(ShellDialogComponent, {
				data: <ShellDialogComponentData>{
					title: "Keyboard Shortcuts",
					component: () => ({
						factory: factoryResolver.resolveComponentFactory(KeyboardShortcutsComponent),
						injector: ng.Injector.create([
							{ provide: 'shortcuts', useValue: shortcuts }
						], injector)
					})
				}
			});
		});

		const commandMetadata = [
			{
				name: "project.new",
				description: "Starts an empty project.",
				command: newCommand,
				gesture: undefined
			},
			{
				name: "project.save",
				description: "Saves the current project.",
				command: saveCommand,
				gesture: { key: "s", ctrl: true, alt: false, shift: false }
			},
			{
				name: "project.saveAs",
				description: "Saves the current project as a downloadable file.",
				command: saveAsCommand,
				gesture: { key: "s", ctrl: true, alt: false, shift: true }
			},
			{
				name: "project.open",
				description: "Opens a project file.",
				command: openCommand,
				gesture: { key: "o", ctrl: true, alt: false, shift: false }
			},

			{
				name: "editor.view.project",
				description: "Toggles visibility of project and resources sidebar.",
				command: viewToggleProject.commandImpl,
				gesture: { key: "e", ctrl: true, alt: false, shift: false }
			},
			{
				name: "editor.view.properties",
				description: "Toggles visibility of properties sidebar.",
				command: viewToggleProperties.commandImpl,
				gesture: { key: "p", ctrl: true, alt: false, shift: false }
			},
			{
				name: "editor.view.timeline",
				description: "Toggles visibility of timeline.",
				command: viewToggleTimeline.commandImpl,
				gesture: { key: "g", ctrl: true, alt: false, shift: false }
			},
			{
				name: "editor.view.samples",
				description: "Toggles visibility of shape samples.",
				command: viewToggleSamples.commandImpl,
				gesture: undefined
			},

			{
				name: "input.configure",
				description: "Shows a dialog that allows the configuration of inputs.",
				command: inputConfigureCommand,
				gesture: { key: "i", ctrl: true, alt: false, shift: false }
			},
			{
				name: "data.tracking",
				description: "Shows a dialog where tracked user interaction data is shown and can be exported.",
				command: dataTrackingDialogCommand,
				gesture: { key: "m", ctrl: true, alt: false, shift: false }
			},

			{
				name: "editor.help.usageHelp",
				description: "Shows usage help.",
				command: usageHelpCommand,
				gesture: { key: "F1", ctrl: false, alt: false, shift: false }
			},
			{
				name: "editor.help.keyboardShortcuts",
				description: "Shows keyboard shortcuts.",
				command: keyboardShortcutsCommand,
				gesture: { key: "?", ctrl: true, alt: false, shift: true }
			},

			// Override default fullscreen to easily keep the fullscreen state synchronized.
			{
				name: "editor.fullscreen",
				description: "Toggles fullscreen.",
				command: new DelegateCommand(() => this.toggleFullscreen()),
				gesture: { key: "F11", ctrl: false, alt: false, shift: false }
			}
		];

		commandMetadata.forEach(meta =>
		{
			commandsService.registerCommand(meta.name, meta.command, meta.description);
			if (meta.gesture)
				keyboardShortcutsService.registerShortcut(
					meta.name, meta.gesture.key, meta.gesture.ctrl, meta.gesture.alt, meta.gesture.shift
				);
		})

		this.mainMenu = [
			{
				label: "File",
				children: [
					{
						label: "New",
						icon: "clear",
						command: "project.new"
					},
					{
						label: "Open...",
						icon: "open_in_browser",
						command: "project.open"
					},
					{
						label: "Save",
						icon: "save",
						command: "project.save"
					},
					{
						label: "Save As...",
						icon: "save",
						command: "project.saveAs"
					}
				]
			},
			{
				label: "Tools",
				children: [
					{
						label: "Configure Input...",
						command: "input.configure"
					},
					{
						label: "Data Tracking...",
						command: "data.tracking"
					}
				]
			},
			{
				label: "View",
				children: [
					viewToggleProject,
					viewToggleProperties,
					viewToggleTimeline,
					viewToggleSamples
				]
			},
			{
				label: "Help",
				children: [
					{
						label: "Usage Help...",
						icon: "help",
						command: "editor.help.usageHelp"
					},
					{
						label: "Keyboard Shortcuts...",
						icon: "keyboard",
						command: "editor.help.keyboardShortcuts"
					}
				]
			}
		];

		// Load project when videos are done
		(async () => 
		{
			const videos = await db.videoResourcesLoaded;
			const json = storage.getItem(this.projectStorageKey);
			if (json != null)
			{
				this.project = ProjectViewModel.deserialize(JSON.parse(json), videos);
				this.autoSelectScene();
			}

		})();

		// Coerce scene on mode change
		this.modeChange.subscribe((mode: "viewer" | "editor") => {
			if (mode == "viewer" && this.projectComponent.currentScene == null)
			{
				let entryPoint = this.project.scenes.filter(s => s.isEntryPoint)[0];
				if (entryPoint == null)
					entryPoint = this.project.scenes[0];

				this.projectComponent.inspectedItem = entryPoint;
			}
		})
	}

	ngOnInit(): void
	{
	}


	private autoSelectScene()
	{
		const entry = this.project.scenes.filter(s => s.isEntryPoint)[0];
		if (entry != null)
			this.projectComponent.inspectedItem = entry;
	}

	private exitFullscreen()
	{
		var fun = (
			this.document.exitFullscreen
			|| this.document.webkitExitFullscreen
			|| (<any>this.document).mozCancelFullScreen
			|| (<any>this.document).msExitFullscreen
		);

		if (fun)
			fun.call(this.document);
	}

	private requestFullscreen(element: HTMLElement)
	{
		var fun = (
			element.requestFullscreen
			|| (<any>element).msRequestFullscreen
			|| (<any>element).mozRequestFullScreen
			|| element.webkitRequestFullScreen
		);
		if (fun)
			fun.call(element, (<any>Element).ALLOW_KEYBOARD_INPUT);
	};

	toggleFullscreen()
	{
		if (this.isFullscreen)
		{
			this.exitFullscreen();
		}
		else
		{
			this.requestFullscreen(this.document.body);
		}
	}
}

interface ViewSettings
{
	projectSidebar: boolean;
	propertiesSidebar: boolean;
	timeline: boolean;
	samples: boolean;
}