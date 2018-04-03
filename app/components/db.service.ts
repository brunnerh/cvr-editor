import * as ng from "@angular/core";
import * as m from "@angular/material";
import { notification } from "../js/utility/snackbar-notification";
import { VideoResource, LokiRecord, RecordUpdateData } from "../../server/db-interfaces";
import { VideoResourceViewModel } from "../js/view-models/editor/video-resource-view-model";

@ng.Injectable()
export class DBService
{
	private readonly videosRoute = "/editor/videos";
	private readonly _videoResources: VideoResourceViewModel[] = [];

	/** Gets the video resources list. */
	get videoResources() { return <ReadonlyArray<VideoResourceViewModel>>this._videoResources; }

	/** Event that fires on the initial loading of the video resources list. */
	readonly videoResourcesLoaded: Promise<ReadonlyArray<VideoResourceViewModel>>;

	constructor(
		@ng.Inject('fetch') private fetch: GlobalFetch,
		@ng.Inject(m.MatSnackBar) private snackBar: m.MatSnackBar
	)
	{
		this.videoResourcesLoaded = new Promise(async (resolve, reject) =>
		{
			try
			{
				let res = await this.fetch.fetch(this.videosRoute);
				if (res.status != 200)
					throw new Error(res.statusText);

				let videos = <VideoResource[]>await res.json();
				videos.forEach(v => this.videoResourcePush(v));

				resolve(this.videoResources);
			}
			catch (e)
			{
				notification(this.snackBar, `Could not fetch videos from server. (${e})`, { panelClass: "warn" });
				reject();
			}
		});
	}

	/**
	 * Adds a video resource entity to the view models list.
	 * @param entity The video resource entity.
	 */
	private videoResourcePush(entity: VideoResource) : VideoResourceViewModel
	{
		const vm = new VideoResourceViewModel(this.autoUpdateEntity(this.videosRoute, entity));
		this._videoResources.push(vm);

		return vm;
	}

	/**
	 * Uploads a new video file.
	 * @param file The file to upload.
	 */
	async videoResourceAdd(file: File)
	{
		var data = new FormData()
		data.append('file', file);

		try
		{
			const result = await this.fetch.fetch(this.videosRoute, {
				method: "POST",
				body: data
			}).then<VideoResource>(r => r.json());

			return this.videoResourcePush(result);
		}
		catch (e)
		{
			notification(this.snackBar, `Failed to upload file ${file.name}. (${e})`);
			throw Error("Upload failed.");
		}
	}

	/**
	 * Deletes a video resource.
	 * @param item The item to delete from the server.
	 */
	async videoResourceDelete(item: VideoResourceViewModel)
	{
		try
		{
			const res = await this.fetch.fetch(this.videosRoute, {
				method: "DELETE",
				headers: new Headers({ "Content-Type": "application/json" }),
				body: JSON.stringify({ id: item.entity.$loki })
			});
			if (res.status != 200)
				throw new Error(res.statusText);

			const index = this._videoResources.indexOf(item);
			this._videoResources.splice(index, 1);
		} catch (e)
		{
			notification(this.snackBar, `Could not delete video from server. (${e})`, { panelClass: "warn" });
		}
	}

	/**
	 * Sets up property hooks that update records on the server a short time after a property was changed.
	 * 
	 * @param baseRoute The route of the collection the item is a part of.
	 * @param item The item to hook into.
	 */
	private autoUpdateEntity<T extends LokiRecord>(baseRoute: string, item: T) : T
	{
		const keys = Object.getOwnPropertyNames(item);
		for (const key of keys)
		{
			const oldDescriptor = Object.getOwnPropertyDescriptor(item, key)!;

			let timeoutHandle: number;

			Object.defineProperty(item, key, {
				enumerable: true,
				configurable: true,
				get: () => oldDescriptor.value,
				set: value =>
				{
					// Clear old scheduled update if there is one.
					window.clearTimeout(timeoutHandle);

					oldDescriptor.value = value;

					// Update database entry after some delay.
					timeoutHandle = window.setTimeout(async () =>
					{
						try
						{
							const res = await this.fetch.fetch(baseRoute + "/update", {
								method: "POST",
								headers: new Headers({ "Content-Type": "application/json" }),
								body: JSON.stringify(<RecordUpdateData>{ 
									id: item.$loki,
									key: key,
									value: value 
								})
							});
							if (res.status != 200)
								throw new Error(res.statusText);
						} catch (e)
						{
							notification(this.snackBar, `There was an error updating a server record. (${e})`, { panelClass: "warn" });
						}
					}, 500);
				}
			});
		}

		return item;
	}
}