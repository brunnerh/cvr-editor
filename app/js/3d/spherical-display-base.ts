import * as THREE from "three";

/**
 * Base class for spherical displays. Add the {@link SphericalDisplayBase.mesh} to the scene graph.
 * Note that the sphere is flipped on the X axis.
 */
export abstract class SphericalDisplayBase
{
	/** The radius of the spherical display. */
	readonly radius = 1000;
	/** The number of segments (polygons) per axis. */
	readonly segmentCount = 100;

	protected material: THREE.MeshBasicMaterial;

	readonly mesh: THREE.Mesh;

	constructor()
	{
		let sphere = new THREE.SphereGeometry(this.radius, this.segmentCount, this.segmentCount);
		sphere.scale(-1, 1, 1); // Necessary to not have a flipped texture. This also flips normals, so front side should be rendered.
		let material = new THREE.MeshBasicMaterial({ side: THREE.FrontSide });
		this.mesh = new THREE.Mesh(sphere, material);

		this.material = material;
	}
}