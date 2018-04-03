import * as THREE from "three";
import { SphericalDisplayBase } from "./spherical-display-base";
import { Stereoscopy } from "../utility/user-input-interfaces";

/**
 * Class representing the spherical displays used for a video.
 */
export class SphericalVideoDisplay extends SphericalDisplayBase
{
	/**
	 * Contains the raw vector that should be used for stereoscopy.
	 * Partly determines the range of the video to display in this viewer.
	 */
	private stereoscopyVector = new THREE.Vector2(1, 1);
	/**
	 * Contains the raw vector that should be used for mapping.
	 * Partly determines the range of the video to display in this viewer.
	 */
	private mappingVector = new THREE.Vector2(1, 1);

	private texture: THREE.Texture;

	/**
	 * Creates a new spherical display view model.
	 * @param index The index of the display, i.e. 0 = left, 1 = right
	 */
	constructor(public index: number)
	{
		super();
	}

	updateTexture(video: HTMLVideoElement): this
	{
		if (this.texture != null)
			this.texture.dispose();

		let texture = new THREE.Texture(video);
		texture.mapping = THREE.UVMapping;
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
		texture.format = THREE.RGBFormat;

		this.material.map = texture;
		this.material.needsUpdate = true;

		this.texture = texture;

		return this;
	}

	updateMapping(xRepeat: number = 1, yRepeat: number = 1): this
	{
		this.mappingVector = new THREE.Vector2(xRepeat, yRepeat);

		this.updateTextureRepeat();

		return this;
	}

	updateStereoscopy(type: Stereoscopy): this
	{
		// Set layers
		switch (type)
		{
			case "none":
				this.mesh.layers.set(this.index == 0 ? 0 : -1) // Only display first display.
				break;
			case "vertical":
			case "horizontal":
				this.mesh.layers.set(this.index + 1);
				break;
		}

		switch (type)
		{
			case "none":
				this.texture.offset = new THREE.Vector2(0, 0);
				this.stereoscopyVector = new THREE.Vector2(1, 1);
				break;
			case "vertical":
				this.texture.offset = new THREE.Vector2(0, this.index * 0.5);
				this.stereoscopyVector = new THREE.Vector2(1, 0.5);
				break;
			case "horizontal":
				this.texture.offset = new THREE.Vector2(this.index * 0.5, 0);
				this.stereoscopyVector = new THREE.Vector2(0.5, 1);
				break;
		}

		this.updateTextureRepeat();

		return this;
	}

	/** Applies logic necessary upon presenting state change. */
	onPresentingState(_isPresenting: boolean): this
	{
		//TODO if necessary

		return this;
	}

	/** Sets video texture to update. */
	textureNeedsUpdate(): this
	{
		this.texture.needsUpdate = true;

		return this;
	}

	/** Updates the texture repeat based on the mapping and stereoscopy vector states. */
	private updateTextureRepeat(): this
	{
		this.texture.repeat = this.mappingVector.clone().multiply(this.stereoscopyVector.clone());

		return this;
	}
}