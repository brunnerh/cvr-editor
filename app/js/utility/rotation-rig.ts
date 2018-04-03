import * as THREE from "three";

/**
 * Class that represents a rig for easier rotation an object via yaw, pitch and roll.
 */
export class RotationRig
{
	/** Gets the rig member for the yaw rotation. First element in the chain. */
	readonly yawObject: THREE.Object3D;
	/** Gets the rig member for the pitch rotation. Second element in the chain. */
	readonly pitchObject: THREE.Object3D;
	/** Gets the rig member for the roll rotation. Third element in the chain. */
	readonly rollObject: THREE.Object3D;

	/** Gets or sets the yaw of the rig. */
	get yaw(): number { return this.yawObject.rotation.y; }
	set yaw(value: number) { this.yawObject.rotation.y = value; }
	
	/** Gets or sets the pitch of the rig. */
	get pitch(): number { return this.pitchObject.rotation.x; }
	set pitch(value: number) { this.pitchObject.rotation.x = value; }

	/** Gets or sets the roll of the rig. */
	get roll(): number { return this.rollObject.rotation.z; }
	set roll(value: number) { this.rollObject.rotation.z = value; }

	/** Gets the position of the rig. */
	get position(): THREE.Vector3 { return this.yawObject.position }

	/**
	 * Creates a new rotation rig and attaches the object to it.
	 * @param objects The objects to rig.
	 */
	constructor(...objects: THREE.Object3D[])
	{
		let yaw: THREE.Object3D = new THREE.Object3D();
		let pitch: THREE.Object3D = new THREE.Object3D();
		let roll: THREE.Object3D = new THREE.Object3D();

		yaw.add(pitch);
		pitch.add(roll);
		roll.add(...objects);

		this.yawObject = yaw;
		this.pitchObject = pitch;
		this.rollObject = roll;
	}
}