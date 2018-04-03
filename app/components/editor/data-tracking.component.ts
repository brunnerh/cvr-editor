import * as ng from "@angular/core";
import { DataTrackingService, VRHeadDirectionEntry } from "../data-tracking.service";
import * as JSZip from "jszip";
import * as dateformat from "dateformat";

@ng.Component({
	selector: "cvr-data-tracking",
	template: `
		<mat-tab-group>
			<mat-tab label="Events">
				<div class="tab-content">
					<table>
						<thead>
							<tr>
								<th>Timestamp</th>
								<th>Type</th>
								<th>Target Name</th>
							</tr>
						</thead>
						<tbody>
							<tr *ngIf="dataTrackingService.events.length == 0">
								<td class="center-text" colspan="3">
									[ No data. ]
								</td>
							</tr>
							<tr *ngFor="let event of dataTrackingService.events">
								<td>{{ event.timestamp | date:'HH:mm:ss.SSS' }}</td>
								<td>{{ event.type }}</td>
								<td *ngIf="event.target">{{ event.target.name }}</td>
							</tr>
						</tbody>
					</table>
				</div>
			</mat-tab>

			<mat-tab label="Head Direction">
				<div class="tab-content">
					<table>
						<thead>
							<tr>
								<th>Timestamp</th>
								<th>Scene Name</th>
								<th>X</th>
								<th>Y</th>
							</tr>
						</thead>
						<tbody>
						<tr *ngIf="dataTrackingService.headDirections.length == 0">
							<td class="center-text" colspan="4">
								[ No data. ]
							</td>
						</tr>
							<tr *ngFor="let entry of dataTrackingService.headDirections">
								<td>{{ entry.timestamp | date:'HH:mm:ss.SSS' }}</td>
								<td>{{ entry.scene.name }}</td>
								<td>{{ entry.x | number:'1.1-1' }}</td>
								<td>{{ entry.y | number:'1.1-1' }}</td>
							</tr>
						</tbody>
					</table>
				</div>
			</mat-tab>
		</mat-tab-group>

		<div class="flex-container column center-items p-5">
			<button mat-raised-button (click)="exportZip()">
				<mat-icon>file_download</mat-icon>
				Export ZIP
			</button>
		</div>
	`,
	styles: [`
		table
		{
			border-collapse: separate;
			border-spacing: 50px 0;
		}
		.tab-content
		{
			padding: 10px;
		}
		.center-text
		{
			text-align: center;
		}
	`]
})
export class DataTrackingComponent
{
	constructor(
		public dataTrackingService: DataTrackingService,
		@ng.Inject("document") private document: Document
	)
	{
	}

	async exportZip()
	{
		const zip = new JSZip();

		// Serialize events
		const eventData = this.dataTrackingService.events.map(e => ({
			timestamp: e.timestamp,
			scene: e.scene.name,
			type: e.type,
			target: e.target == null ? null : e.target.name
		}));
		zip.file("events.json", JSON.stringify(eventData));

		// Create head direction files for each scene
		const headDir = zip.folder("head-direction");

		let i = 1;
		let currentBlock: VRHeadDirectionEntry[] = [];
		const tag = "CVR_" + new Date().toISOString();
		const writeBlock = () => {
			const start = currentBlock[0];
			const head = `version: 2
movie: ${start.scene.name}
logDelay: 0
tag: ${tag}
time: ${dateformat(start.timestamp, "yyyy-mm-dd_HH:MM:ss")}

# seekPos lat lon
`;
			const body = currentBlock.map(entry =>
				`${entry.seekPosition} ${entry.y} ${entry.x}`
			).join("\n");

			const index = (<any>i.toString()).padStart(3, "0");
			headDir.file(`${index}-${start.scene.name}.raw`, head + body);
		};	

		this.dataTrackingService.headDirections.forEach(entry => {
			// Push continuous entries to current block
			if (currentBlock.length == 0 || currentBlock[currentBlock.length - 1].scene == entry.scene)
			{
				currentBlock.push(entry);
			}
			// End block and write to zip
			else
			{
				writeBlock();

				// New block
				i++;
				currentBlock = [entry];
			}
		});
		// Last block
		if (currentBlock.length > 0)
			writeBlock();

		const archive = await zip.generateAsync<"base64">({ type: "base64" });

		const nowString = (<any>new Date()).toGMTString();
		this.download(`tracking-data ${nowString}.zip`, archive, "application/zip")
	}

	download(fileName: string, content: string, mime: string)
	{
		const document = this.document;
		var element = document.createElement('a');
		element.setAttribute('href', `data:${mime};base64,${encodeURIComponent(content)}`);
		element.setAttribute('download', fileName);
		element.style.display = 'none';
		element.click();
	}
}