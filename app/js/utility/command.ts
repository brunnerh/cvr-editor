export interface Command<T>
{
	/** Executes the command. */
	execute(args: T): void;
	/** Returns a value indicating whether the command can be executed. */
	canExecute(args: T): boolean;
}

export class DelegateCommand<T> implements Command<T>
{
	execute(args: T)
	{
		this.executeFunction(args);
	}
	canExecute(args: T)
	{
		if (this.canExecuteFunction == null)
			return true

		return this.canExecuteFunction(args);
	}

	constructor(
		private executeFunction: (args: T) => void,
		private canExecuteFunction?: (args: T) => boolean
	)
	{

	}
}