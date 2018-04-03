import * as THREE from "three";

/** Class for a head-up display. Use the render function to render the HUD (after the scene it should be overlaid on). */
export class HUD
{
	/** Gets the resolution on the horizontal axis. */
	get width(): number { return this.canvas.width; }

	/** Gets the resolution on the vertical axis. */
	get height(): number { return this.canvas.height; }

	readonly root = new THREE.Object3D();

	private readonly leftPlane: THREE.Mesh;
	private readonly rightPlane: THREE.Mesh;

	private readonly texture: THREE.Texture;

	private readonly context: CanvasRenderingContext2D;

	/**
	 * Creates a new HUD instance.
	 * @param canvas The canvas to render to.
	 */
	constructor(
		readonly canvas: HTMLCanvasElement
	)
	{
		var texture = new THREE.Texture(canvas)
		texture.minFilter = THREE.LinearFilter;
		texture.needsUpdate = true;

		var material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false });
		material.needsUpdate = true;

		var planeGeometry = new THREE.PlaneGeometry(1, 1);

		this.texture = texture;
		this.leftPlane = new THREE.Mesh(planeGeometry, material);
		this.rightPlane = new THREE.Mesh(planeGeometry, material);

		this.root.add(this.leftPlane, this.rightPlane);

		this.root.layers.enable(1);
		this.root.layers.enable(2);

		this.context = this.canvas.getContext("2d")!;
	}

	/**
	 * Updates the size of the HUD.
	 * @param width The new width of the hud.
	 * @param height The new height of the hud.
	 * @param fov The current field of view of the camera.
	 * @param manualShift Manual shift in the given axes at a given distance, non-symmetric.
	 * @param projectionShift Projection caused shift in the given axes at a given distance, symmetric.
	 */
	update(
		isPresenting: boolean,
		width: number,
		height: number,
		fov: number,
		manualShift: { x: number, y: number },
		projectionShift?: { distance: number, x: number, y: number },
	)
	{
		this.canvas.width = width;
		this.canvas.height = height;

		this.leftPlane.scale.set(width, height, 1);
		this.rightPlane.scale.set(width, height, 1);

		const distance = (0.5 * height) / Math.tan(0.5 * fov);
		const lp = this.leftPlane.position;
		const rp = this.rightPlane.position;
		lp.z = -distance;
		rp.z = -distance;

		if (projectionShift != null)
		{
			// Intercept theorem:
			//   shift distance/distance = shift/shift at distance
			//   => shift at distance = (distance * shift) / shift distance
			lp.x = (projectionShift.x * distance) / projectionShift.distance;
			lp.y = (projectionShift.y * distance) / projectionShift.distance;

			rp.x = (-projectionShift.x * distance) / projectionShift.distance; // Horizontal shift is flipped for the right eye
			rp.y = (projectionShift.y * distance) / projectionShift.distance;
		}
		else
		{
			lp.x = 0;
			lp.y = 0;
			rp.x = 0;
			rp.y = 0;
		}

		lp.x += manualShift.x * width;
		lp.y += manualShift.y * height;
		rp.x += manualShift.x * width;
		rp.y += manualShift.y * height;

		this.leftPlane.updateMatrix();
		this.rightPlane.updateMatrix();

		this.leftPlane.layers.set(isPresenting ? 1 : 0);
		this.rightPlane.layers.set(isPresenting ? 2 : -1);
	}

	/** Clears the canvas. */
	clear()
	{
		this.context.clearRect(0, 0, this.width, this.height);
		// Debugging
		// this.context.fillStyle = "#ffffff11";
		// this.context.fillRect(0, 0, this.width, this.height);
		this.texture.needsUpdate = true;
	}
	/**
	 * Allows the client function to draw to the canvas and renders it to the display.
	 */
	draw(callback: (context: CanvasRenderingContext2D, width: number, height: number) => void)
	{
		this.context.save();
		callback(this.context, this.width, this.height);
		this.context.restore();

		this.texture.needsUpdate = true;
	}
}