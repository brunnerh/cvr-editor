/// <reference path="../../js/typings/resize-observer.d.ts" />


import * as ng from '@angular/core';
import * as mat from '@angular/material';
import { ProjectViewModel } from '../../js/view-models/editor/project-view-model';
import { SceneViewModel } from '../../js/view-models/editor/scene-view-model';
import { notify } from '../../js/utility/ng-notify';
import { RotationRig } from '../../js/utility/rotation-rig';
import { SphericalVideoDisplay, SphericalCanvasDisplay } from '../../js/3d';
import * as THREE from "three";
import { Mapping, Stereoscopy } from '../../js/utility/user-input-interfaces';
import { notification } from '../../js/utility/snackbar-notification';
import { DocumentInputState } from '../../js/utility/document-input-state';
import { EventUtility, SubscriptionCancellationToken } from '../../js/utility/events-utility';
import { ButtonViewModel } from '../../js/view-models/editor/button-view-model';
import { HUD } from '../../js/3d/hud';
import { GamepadInputsService } from '../gamepad-inputs.service';
import { UVPoint, Point3, uvToLatLon, degToRad, worldToLatLon } from '../../js/utility/geometry';
import config from '../../../config';
import { cachedFunction } from '../../js/utility/decorators';
import { DataTrackingService } from '../data-tracking.service';
import { mat4 } from 'gl-matrix';
import { AffordanceMetadata } from '../../js/view-models/editor/affordances/affordance-view-model';

@ng.Component({
	selector: 'cvr-editor-viewer',
	template: `
		<div class="flex-star flex-container stretch-items"
			style="position: relative">
			<div #container class="flex-star" (click)="onClick()">
			</div>
			<button mat-raised-button *ngIf="canEnterVR() | async" (click)="enterVR()"
				style="position: absolute; right: 30px; bottom: 30px">
				VR
			</button>
		</div>
	`,
	styles: [`
		:host
		{
			user-select: none;
		}
	`]
})
export class ViewerComponent implements ng.OnInit, ng.OnDestroy
{
	private _project: ProjectViewModel
	@ng.Input()
	get project(): ProjectViewModel { return this._project; };
	set project(value: ProjectViewModel)
	{
		value.viewportSettings.showHudChange.subscribe((value: boolean) =>
		{
			if (value)
				this.camera.add(this.hud.root);
			else
				this.camera.remove(this.hud.root);
		});

		this._project = value;
	};

	private _currentScene: SceneViewModel;

	@notify()
	@ng.Input()
	get currentScene(): SceneViewModel | null { return this._currentScene; }
	set currentScene(value)
	{
		if (value == null)
			return;

		this._currentScene = value;
	}
	@ng.Output() currentSceneChange = new ng.EventEmitter<SceneViewModel>();

	@ng.ViewChild("container", { read: ng.ElementRef }) containerRef: ng.ElementRef;
	get container(): HTMLDivElement { return this.containerRef.nativeElement!; }

	video: HTMLVideoElement = this.document.createElement("video");
	renderer: WebGLRendererEx;
	scene: THREE.Scene;
	private _camera: THREE.PerspectiveCamera;
	get camera(): THREE.PerspectiveCamera { return this.renderer.vr.getCamera(this._camera); };

	/** Gets the current field of view (vertical) in radians. */
	get fov()
	{
		if (this.isPresenting)
		{
			if (this.project.viewportSettings.effectiveFov != -1)
				return degToRad(this.project.viewportSettings.effectiveFov);

			const ta = this.frameData.leftProjectionMatrix[5];
			return Math.atan2(1.0, ta) * 2.0;
		}
		else
		{
			return degToRad(this.camera.fov);
		}
	}

	/** The object the camera is mounted on to make rotation easier. */
	cameraRig: RotationRig;

	/** Array of helper objects like an axis indicator and a grid. */
	helpers: THREE.Object3D[] = [];

	readonly dislayLeft = new SphericalVideoDisplay(0);
	readonly dislayRight = new SphericalVideoDisplay(1);

	readonly interactionLayer: SphericalCanvasDisplay;

	readonly overlay = new THREE.Object3D();

	readonly hud: HUD;

	private disposeTokens: SubscriptionCancellationToken[] = [];

	isPresenting = false;

	private display: VRDisplay;

	private frameData = new VRFrameData();

	private deferToAnimationFrame: (() => void)[] = [];

	constructor(
		private snackbar: mat.MatSnackBar,
		@ng.Inject('window') private window: Window,
		@ng.Inject('document') private document: Document,
		private gamepadInputs: GamepadInputsService,
		private zone: ng.NgZone,
		private dataTrackingService: DataTrackingService
	)
	{
		this.interactionLayer = new SphericalCanvasDisplay(document.createElement("canvas"));
		this.hud = new HUD(document.createElement("canvas"));

		const ct = EventUtility.cancelable(window, "vrdisplaypresentchange", (e: Event & { display: VRDisplay }) =>
		{
			this.isPresenting = e.display.isPresenting;
			this.onPresentingChanged(this.isPresenting);
		});

		this.video.addEventListener("ended", () =>
		{
			let scene = this.currentScene;
			if (scene == null)
				return;

			scene.endAction.command.execute(this);
		});

		(async () =>
		{
			const displays = await navigator.getVRDisplays();
			if (displays.length > 0)
				this.display = displays[displays.length - 1];
		})();

		this.disposeTokens.push(ct);
	}

	/**
	 * Sets up the scene and starts render loop.
	 */
	sceneSetup()
	{
		this.container.innerHTML = "";

		let dimensions = this.container.getBoundingClientRect();
		let aspect = dimensions.width / dimensions.height;

		let scene = new THREE.Scene();
		let camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 2000);
		camera.layers.enable(1);
		let renderer = this.renderer = <WebGLRendererEx>new THREE.WebGLRenderer();
		renderer.autoClear = false;
		renderer.sortObjects = false;

		this.hud.update(this.isPresenting, dimensions.width, dimensions.height, degToRad(camera.fov), this.project.viewportSettings.manualHudShift);
		camera.add(this.hud.root);

		this.cameraRig = new RotationRig(camera);
		this.cameraRig.yaw = Math.PI;

		renderer.setClearColor(0xffffff, 1);
		renderer.setSize(dimensions.width, dimensions.height);
		renderer.domElement.style.position = "absolute";
		renderer.vr.enabled = true;

		this.container.appendChild(renderer.domElement);

		// Helpers
		var grid = new THREE.GridHelper(10, 10);
		var axis = new THREE.AxisHelper(5);
		scene.add(grid, axis);

		this.helpers.push(grid, axis);

		this.helpers.forEach(h => h.visible = config.debug);

		scene.add(
			this.dislayLeft.mesh,
			this.dislayRight.mesh,
			this.interactionLayer.mesh,
			this.overlay,
			this.cameraRig.yawObject
		);

		this.zone.runOutsideAngular(() =>
			// Currently .animate does not correctly dispose.
			renderer.animate(() =>
			{
				if (this.isPresenting)
					this.display.getFrameData(this.frameData);

				this.dislayLeft.textureNeedsUpdate();
				this.dislayRight.textureNeedsUpdate();

				this.deferToAnimationFrame.forEach(action => action());
				this.deferToAnimationFrame.length = 0;

				if (this.currentScene != null)
				{
					const buttons = this.currentScene.buttons;
					this.trackData(this.currentScene);
					this.drawAffordances(buttons);
				}

				renderer.clear();
				renderer.render(scene, camera);

				if (this.isPresenting)
					this.display.submitFrame(this.frameData.pose);
			})
		);

		this.renderer = renderer;
		this.scene = scene;
		this._camera = camera;
	}

	inputSetup()
	{
		let inputState = new DocumentInputState(this.document);
		this.disposeTokens.push(new SubscriptionCancellationToken(() => inputState.dispose()));

		// Mouse and keyboard controls
		//	Click + Drag:	Rotate view
		//	WARS:			Move forward/backward/strafe
		//	P:				Reset camera
		//	T:				Toggle helpers
		//	G:				Store camera state
		// WARS
		this.disposeTokens.push(this.zone.runOutsideAngular(() => EventUtility.onAnimationFrame(() =>
		{
			let moveSpeed = 0.05;
			let rig = this.cameraRig;
			let transform = (v: THREE.Vector3) => v.applyQuaternion(rig.rollObject.quaternion)
				.applyQuaternion(rig.pitchObject.quaternion)
				.applyQuaternion(rig.yawObject.quaternion)
				.multiplyScalar(moveSpeed);
			var frontBackDirection = transform(new THREE.Vector3(0, 0, -1));
			var leftRightDirection = transform(new THREE.Vector3(-1, 0, 0));

			const { w, r, a, s } = inputState.keyboard;

			if (w == true)
				rig.position.add(frontBackDirection);
			if (r == true)
				rig.position.add(frontBackDirection.multiplyScalar(-1));
			if (a == true)
				rig.position.add(leftRightDirection);
			if (s == true)
				rig.position.add(leftRightDirection.multiplyScalar(-1));
		})));

		// Click + Drag
		let moveEvent = (x: number, y: number) =>
		{
			// if (this.video != null && this.video.paused)
			// {
			// 	this.video.play();
			// }

			if (inputState.mouse[0] == true)
			{
				let rotateSpeed = 0.01;
				let rig = this.cameraRig;

				rig.yaw += -x * rotateSpeed;
				rig.pitch += -y * rotateSpeed;
			}
		};
		{
			let lastTouch = { x: 0, y: 0 };
			let saveTouch = (e: TouchEvent) => lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
			this.container.addEventListener("touchstart", saveTouch);
			this.container.addEventListener("touchmove", e =>
			{
				moveEvent(e.touches[0].clientX - lastTouch.x, e.touches[0].clientY - lastTouch.y);
				saveTouch(e);
			});
		}
		EventUtility.throttled<MouseEvent>(this.container, "mousemove", e => moveEvent(e.movementX, e.movementY));

		// Keypresses
		const keysToken = EventUtility.cancelable(this.document, "keypress", (e: KeyboardEvent) => 
		{
			// P: Reset
			if (e.key == "p")
			{
				this.cameraRig.yaw = 0;
				this.cameraRig.pitch = 0;
				this.cameraRig.roll = 0;
				this.cameraRig.position.set(0, 0, 0);

				let url = new URL(location.href);
				url.searchParams.delete("camera");
				history.replaceState(null, "", url.href);
			}
			// T: Toggle helpers
			if (e.key == "t")
			{
				this.helpers.forEach(h => h.visible = !h.visible);
			}
			// X: Draw point as sphere
			if (e.key == "x")
			{
				const input = prompt("Position as JSON (e.g. {x: 0, y: 0, z: 0})");
				if (input == null)
					return;

				//TODO: fix this
				const sphere = new THREE.Mesh(new THREE.SphereGeometry(10, 100, 100), new THREE.MeshBasicMaterial());
				const pos = <Point3>JSON.parse(input);
				sphere.position.set(pos.x, pos.y, pos.z);
				sphere.matrixWorldNeedsUpdate = true;
				this.scene.add(sphere);
			}
			if (e.key == "l")
			{
				if (this.video != null)
					this.video.play();
			}
		});

		this.disposeTokens.push(keysToken);

		// VR Hook
		const vrToken = EventUtility.cancelable(this.window, "vrdisplaypresentchange", (e: Event & { display: VRDisplay }) =>
			this.updatePresentingState(e.display.isPresenting)
		);

		this.disposeTokens.push(vrToken);

		if ('ResizeObserver' in self)
		{
			const obs = new ResizeObserver(() => this.updateRenderSize());
			obs.observe(this.container);

			this.disposeTokens.push(new SubscriptionCancellationToken(() => obs.disconnect()));
		}
		else
		{
			// Size polling update (window resize is not reliable as it does not capture internal layout changes)
			let animFrame = 0;
			const resizeToken = EventUtility.onAnimationFrame(() =>
			{
				// Update every 10 frames
				if (animFrame++ % 10)
					return;

				this.updateRenderSize();
			});

			this.disposeTokens.push(resizeToken);
		}

		// Gamepad actions hook
		const actionSubscription = this.gamepadInputs.onAction.subscribe({
			next: (action: string) =>
			{
				if (action == "click")
					this.onClick();
			}
		})

		this.disposeTokens.push(new SubscriptionCancellationToken(() => actionSubscription.unsubscribe()));
	}

	/** Resizes/positions the rendered element/HUD and adjusts camera. */
	updateRenderSize()
	{
		const update = () =>
		{
			// HUD parameters
			let width: number, height: number;
			let shift: Shift | undefined = undefined;
			if (this.isPresenting)
			{
				// Defer if frame data is not initialized correctly.
				if (this.frameData.leftProjectionMatrix.every(x => x == 0))
				{
					this.deferToAnimationFrame.push(update);
					return;
				}

				const params = this.display.getEyeParameters("left");
				width = params.renderWidth;
				height = params.renderHeight;

				const leftProj = mat4.clone(<mat4>this.frameData.leftProjectionMatrix);
				const leftInverse = mat4.invert(mat4.create(), leftProj)!;
				const invert = (x: number, y: number, z = -1) =>
					this.invert(leftInverse, x, y, z);

				const z = 1; // Calculate with far plane (better accuracy, maybe?)
				const zDist = Math.abs(invert(0, 0, z)[2]);

				const bottom = invert(0, -1, z)[1];
				const top = invert(0, 1, z)[1];
				const yDelta = (top + bottom) / 2;

				const left = invert(-1, 0, z)[0];
				const right = invert(1, 0, z)[0];
				const xDelta = (right + left) / 2;

				shift = {
					x: xDelta,
					y: yDelta,
					distance: zDist
				};
			}
			else
			{
				let dimensions = this.container.getBoundingClientRect();
				this.camera.aspect = dimensions.width / dimensions.height;
				this.camera.updateProjectionMatrix();
				this.renderer.setSize(dimensions.width, dimensions.height);

				width = dimensions.width;
				height = dimensions.height;
			}

			this.hud.update(
				this.isPresenting,
				width,
				height,
				this.fov,
				this.project.viewportSettings.manualHudShift,
				this.project.viewportSettings.shiftHud ? shift : undefined
			);
		}

		update();
	}

	/**
	 * Sets sphere texture to a new video as specified by the URL. Has to be same-origin compliant.
	 * 
	 * @param url The URL of the video to use as texture.
	*/
	updateVideo(url: string): this
	{
		let video = this.video;

		video.src = url;
		video.crossOrigin = "anonymous";
		video.preload = "auto";
		video.play();

		this.dislayLeft.updateTexture(video);
		this.dislayRight.updateTexture(video);

		return this;
	}

	/**
	 * Updates the texture mapping for the video.
	 * @param type The type of mapping used by the video.
	 */
	updateMapping(type: Mapping): this
	{
		let xRepeat = -1;
		switch (type)
		{
			case "360":
				xRepeat = 1;
				break;
			case "180":
				xRepeat = 2;
				break;
		}
		this.dislayLeft.updateMapping(xRepeat);
		this.dislayRight.updateMapping(xRepeat);

		return this;
	}
	updateStereoscopy(type: Stereoscopy): this
	{
		this.dislayLeft.updateStereoscopy(type);
		this.dislayRight.updateStereoscopy(type);

		return this;
	}

	updatePresentingState(isPresenting: boolean): this
	{
		this.dislayLeft.onPresentingState(isPresenting);
		this.dislayRight.onPresentingState(isPresenting);

		return this;
	}

	private onPresentingChanged(isPresenting: boolean)
	{
		this.updateRenderSize();

		if (isPresenting == false)
		{
			this.dataTrackingService.logEvent(this.currentScene!, "exit-vr", { name: this.display.displayName });
			if (this.display.capabilities.hasExternalDisplay && this.renderer.domElement.parentNode == null)
				this.container.appendChild(this.renderer.domElement);
		}
	}

	/**
	 * Projects a normalized device coordinate ([-1, 1] in each axis) to view coordinates.
	 * @param inverseProjection The inverse of a projection matrix to use.
	 * @param x The X coordinate (horizontal).
	 * @param y The Y coordinate (vertical).
	 * @param z The Z coordinate (depth).
	 * @returns Array with [x, y, z].
	 */
	private invert(inverseProjection: mat4, x: number, y: number, z = -1): [number, number, number]
	{
		return <any>mat4.multiply(mat4.create(), inverseProjection, <any>[x, y, z, 1])
			.slice(0, 4)
			.map((x, _, arr) => x / arr[3])
			.slice(0, 3);
	}

	private previouslyHovered: ButtonViewModel[] = [];
	private trackData(scene: SceneViewModel)
	{
		// Only track when presenting
		if (this.isPresenting == false)
			return;

		const cursor = this.getCameraUV();
		const cursorLatLon = uvToLatLon(cursor);

		this.dataTrackingService.logHeadDirection(scene, this.video.currentTime, cursorLatLon.lon, cursorLatLon.lat);

		const hovering = scene.buttons.filter(b => b.hits(cursor, this.video.currentTime));
		const noLongerHovering = this.previouslyHovered.filter(b => hovering.indexOf(b) == -1);
		const newlyHovering = hovering.filter(b => this.previouslyHovered.indexOf(b) == -1);

		noLongerHovering.forEach(b => this.dataTrackingService.logEvent(this.currentScene!, "hover-out", b));
		newlyHovering.forEach(b => this.dataTrackingService.logEvent(this.currentScene!, "hover-in", b));

		this.previouslyHovered = hovering;
	}

	private drawAffordances(buttons: ButtonViewModel[])
	{
		const styles = this.window.getComputedStyle(this.document.body);
		const colors = {
			primary: styles.getPropertyValue("--primary").trim(),
			secondary: styles.getPropertyValue("--accent").trim(),
		};
		const cursor = this.getCameraUV();

		this.interactionLayer.clear();
		this.hud.clear();

		const metadata: AffordanceMetadata = {
			colors: colors,
			cursor: cursor,
			cameras: {
				perspective: this.camera,
			},
			fov: this.fov,
			viewportSettings: <any>this.project.settings.filter(e => e.type == "viewport")[0],
			currentTime: this.video.currentTime
		};
		this.project.affordances
			.filter(a => a.enabled)
			.forEach(affordance =>
				affordance.render(buttons, {
					interaction: this.interactionLayer,
					overlay: this.overlay,
					hud: this.hud
				}, metadata)
			);
	}

	async enterVR()
	{
		// Do not query for displays here because it breaks in Firefox. (Direct user action required.)
		const display = this.display;

		if (display.isPresenting)
		{
			await display.exitPresent()
			return;
		}

		if (this.video != null)
			// (May require direct user action.)
			this.video.play();

		await display.requestPresent([{ source: this.renderer.domElement }]);

		this.video.currentTime = 0;

		this.dataTrackingService.reset();
		this.dataTrackingService.logEvent(this.currentScene!, "enter-vr", { name: display.displayName });

		if (display.capabilities.hasExternalDisplay && this.project.viewportSettings.removeBrowserView)
			this.renderer.domElement.remove();

		this.renderer.vr.setDevice(display);
	}

	onClick()
	{
		if (this.currentScene == null)
			return;

		// Check overlay first
		const overlayHit = this.hit(this.overlay, true)[0];
		if (overlayHit != null)
		{
			const target = overlayHit.object;
			target.dispatchEvent({ type: "click" });
			this.dataTrackingService.logEvent(this.currentScene!, "overlay-click", target);

			return;
		}

		// Check button hits
		var cursor = this.getCameraUV();
		const buttonHit = this.currentScene.buttons.filter(btn => btn.hits(cursor, this.video.currentTime))[0];
		if (buttonHit != null)
		{
			buttonHit.action!.command.execute(this);
			this.dataTrackingService.logEvent(this.currentScene!, "button-click", buttonHit);
		}
	}

	hit(target: THREE.Object3D, recursive?: boolean): THREE.Intersection[]
	{
		const raycaster = new THREE.Raycaster();
		const data = this.getCameraGeoData();
		raycaster.set(data.position, data.direction);

		return raycaster.intersectObject(target, recursive);
	}

	getCameraGeoData(): { position: THREE.Vector3, direction: THREE.Vector3 }
	{
		if (this.isPresenting && this.frameData.leftProjectionMatrix.some(x => x != 0))
		{
			const proj = mat4.clone(<mat4>this.frameData.leftProjectionMatrix);
			// Change shift values
			proj[8] = 0;
			proj[9] = 0;
			const inverse = mat4.invert(mat4.create(), proj)!;
			const cameraPosition = new THREE.Vector3(...this.frameData.pose.position);
			const cameraRotation = new THREE.Quaternion(...this.frameData.pose.orientation);
			// Center in world coordinates at far plane
			const centerVector = new THREE.Vector3(...this.invert(inverse, 0, 0, 1));
			// Apply rotations of rig and camera
			centerVector.applyQuaternion(cameraRotation).applyQuaternion(this.cameraRig.rollObject.getWorldQuaternion());

			return { position: cameraPosition, direction: centerVector.sub(cameraPosition).normalize() };
		}
		else
		{
			return { position: this.camera.getWorldPosition(), direction: this.camera.getWorldDirection() };
		}
	}

	private getCameraUV(): UVPoint
	{
		const { direction } = this.getCameraGeoData()
		const latLon = worldToLatLon(direction);

		// Assume position offset to be negligible.
		// Calculating the UV this way rather than ray casting is significantly faster.

		const u = (latLon.lon + 180) % 360 / 360;
		const v = (latLon.lat + 90) % 180 / 180;

		return { u, v };
	}

	private onSceneChange(scene: SceneViewModel | null)
	{
		if (scene == null) return;

		if (scene.video == null)
		{
			notification(this.snackbar, `No video specified for current scene (${scene.name}).`, { panelClass: "warn" });
			return;
		}

		this.updateVideo(scene.video.videoSrc);
		this.updateStereoscopy(scene.video.stereoscopy);
		this.updateRenderSize();
	}

	@cachedFunction()
	async canEnterVR()
	{
		const displays = await this.window.navigator.getVRDisplays();
		return displays.length > 0;
	}

	ngOnInit()
	{
		this.sceneSetup();

		this.currentSceneChange.subscribe(this.onSceneChange.bind(this));

		if (this.currentScene != null)
			this.onSceneChange(this.currentScene);

		this.inputSetup();
	}

	ngOnDestroy()
	{
		this.renderer.dispose();

		if (this.video)
			this.video.src = "";

		this.disposeTokens.forEach(t => t.cancel());
	}
}

export interface Shift
{
	distance: number,
	x: number,
	y: number
}