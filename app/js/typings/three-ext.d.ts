// npm typings are outdated.

declare interface WebVRManager
{
	enabled: boolean;
	getDevice(): VRDisplay;
	setDevice(display: VRDisplay): void;
	getCamera(camera: THREE.PerspectiveCamera): THREE.PerspectiveCamera;
}

declare type WebGLRendererEx = THREE.WebGLRenderer & { vr: WebVRManager, animate: (fun: (time: number) => void) => void };