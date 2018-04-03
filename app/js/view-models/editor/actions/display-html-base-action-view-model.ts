import { ActionViewModel } from "./action-view-model";
import { cachedGetter } from "../../../utility/decorators";
import { DelegateCommand } from "../../../utility/command";
import { ViewerComponent } from "../../../../components/editor/viewer.component";
import * as THREE from "three";
import { editorProperty } from "../../../../components/editor/properties.component";
import { NumberEditorComponent } from "../../../../components/editor/property-editors/index";
import { degToRad } from "../../../utility/geometry";
import { copyOnDefined } from "../../../utility/object-utilities";
import { addToJSON } from "../../../utility/json";

export abstract class DisplayHtmlBaseActionViewModel extends ActionViewModel
{
	static deserializeHtmlBaseAction<T extends DisplayHtmlBaseActionViewModel>(action: T, json: T): T
	{
		return copyOnDefined(json)(action)("latitudeAdjustment");
	}

	abstract html: string;

	@editorProperty("Latitude Adjustment", () => NumberEditorComponent, undefined, {
		tooltip: "Sets an offset in degrees that should be added to the latitude of the displayed plane. "
				+ "Can be used to move the plane to a more convenient reading position."
	})
	latitudeAdjustment = 0;

	@cachedGetter()
	get command()
	{
		return new DelegateCommand((viewer: ViewerComponent) =>
		{
			const geo = new THREE.PlaneGeometry(1, 1);
			const canvas = document.createElement("canvas"); //TODO: document DI

			canvas.width = viewer.hud.width;
			canvas.height = viewer.hud.height;

			const texture = new THREE.CanvasTexture(canvas);
			texture.minFilter = THREE.LinearFilter;
			const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false });
			const plane = new THREE.Mesh(geo, material);
			plane.name = this.parent.name + "[plane]";

			const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
				<foreignObject width="100%" height="100%">
					<div class="root" xmlns="http://www.w3.org/1999/xhtml">
						<style>
							${viewer.project.htmlSettings.css}
						</style>
						${this.html}
					</div>
				</foreignObject>
			</svg>`;

			const ctx = canvas.getContext('2d')!;
			var img = new Image();
			img.crossOrigin = "anonymous";
			var url = `data:image/svg+xml,${svg}`;
			img.onload = () =>
			{
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.fillStyle = "#ffffff";
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(img, 0, 0);

				texture.needsUpdate = true;
			};
			img.src = url;

			plane.scale.set(canvas.width, canvas.height, 1);
			plane.updateMatrix();

			// Position and orient plane
			// tan(fov) = (height/2) / distance;
			// distance = (height/2) / tan(fov);
			const distance = (canvas.height / 2) / Math.tan(viewer.fov / 2);
			const cameraData = viewer.getCameraGeoData();
			// Create vertical plane through camera
			const coplanarPoint = cameraData.position.clone();
			coplanarPoint.y += 10;
			const directionPlane = new THREE.Plane().setFromCoplanarPoints(cameraData.position.clone().add(cameraData.direction), coplanarPoint, cameraData.position);
			const direction = cameraData.direction.clone().applyAxisAngle(directionPlane.normal.clone().normalize(), degToRad(this.latitudeAdjustment));
			plane.position.addScaledVector(direction, distance * 1.5);
			plane.lookAt(cameraData.position);

			// Add plane to scene
			viewer.overlay.add(plane);

			plane.addEventListener("click", () => viewer.overlay.remove(plane));
		})
	}
}
addToJSON(DisplayHtmlBaseActionViewModel.prototype, "latitudeAdjustment");