import { readingTime } from "./human-metrics";
import * as m from "@angular/material";

export function notification(snackBar: m.MatSnackBar, message: string, config?: m.MatSnackBarConfig): m.MatSnackBarRef<m.SimpleSnackBar>
{
	const c = <m.MatSnackBarConfig>{ duration: readingTime(message) };
	if (config != null)
		for (const key in config)
			(<any>c)[key] = (<any>config)[key];

	const notification = snackBar.open(message, "Dismiss", c);
	notification.onAction().subscribe(() => notification.dismiss());

	return notification;
}