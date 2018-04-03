import { Stereoscopy } from "../app/js/utility/user-input-interfaces";

export interface LokiRecord
{
	/** A unique ID, which is assigned if no other primary key is defined. */
	$loki?: number;
}

export interface VideoResource extends LokiRecord
{
	/** Name of the file as uploaded. */
	name: string;
	/** Time uploaded as ISO 8601 string. */
	timestamp: string;
	/** Absolute path on server. */
	absPath: string;
	/** Relative path on server. */
	relPath: string;
	/** The stereoscopy of the video. */
	stereoscopy: Stereoscopy;
}

/** Describes the format of the payload of an update request. */
export interface RecordUpdateData
{
	/** The ID of the record to update. */
	id: number;
	/** The property of the record to update. */
	key: string;
	/** The new value of the property. */
	value: any;
}