/**
 * Prompts for file upload, asynchronously returns the file/s selected.
 * @param acceptMime The MIME types to accept, can be partial wildcard, e.g. "video/*".
 * @param multiple Whether multiple files should be uploaded.
 */
export function fileUpload(acceptMime: string, multiple?: false) : Promise<File>;
export function fileUpload(acceptMime: string, multiple?: true) : Promise<FileList>;
export function fileUpload(acceptMime: string = "*", multiple: boolean = false)
{
	return new Promise<File | FileList>((res) =>
	{
		// TODO: inject document?
		const input = document.createElement("input");
		input.type = 'file';
		input.accept = acceptMime;
		input.multiple = multiple;
		input.addEventListener("change", () => res(multiple ? input.files! : input.files![0]));
		input.click();
	});
}

export function readText(file: File)
{
	return new Promise<string>((res) =>
	{
		const reader = new FileReader();
		reader.addEventListener("loadend", () => res(reader.result));
		reader.readAsText(file);
	});
}