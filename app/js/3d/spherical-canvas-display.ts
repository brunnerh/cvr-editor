import { SphericalDisplayBase } from "./spherical-display-base";
import * as THREE from "three";

/** A spherical display for content drawn to a canvas. */
export class SphericalCanvasDisplay extends SphericalDisplayBase
{
	/** Gets or sets the resolution on the horizontal axis. */
	get resolutionX(): number { return this.canvas.width; }
	set resolutionX(value: number) { this.canvas.width = value; }

	/** Gets or sets the resolution on the vertical axis. */
	get resolutionY(): number { return this.canvas.height; }
	set resolutionY(value: number) { this.canvas.height = value; }

	private readonly context: CanvasRenderingContext2D;

	/**
	 * Creates a new spherical canvas display instance.
	 * @param canvas The canvas to render to a sphere.
	 * @param resolution The resolution of the canvas along the long side.
	 */
	constructor(
		readonly canvas: HTMLCanvasElement,
		resolution = 4096
	)
	{
		super();

		this.resolutionX = resolution;
		this.resolutionY = resolution / 2;

		this.material.map = new THREE.Texture(this.canvas);
		this.material.transparent = true;
		this.material.needsUpdate = true;

		this.context = this.canvas.getContext("2d")!;
	}
	
	/** Clears the canvas. */
	clear()
	{
		this.context.clearRect(0, 0, this.resolutionX, this.resolutionY);
		this.material.map.needsUpdate = true;
	}

	/**
	 * Allows the client function to draw to canvas and renders it to the display.
	 */
	draw(callback: (context: CanvasRenderingContext2D, width: number, height: number) => void)
	{
		this.context.save();
		callback(this.context, this.resolutionX, this.resolutionY);
		this.context.restore();

		this.material.map.needsUpdate = true;
	}
}