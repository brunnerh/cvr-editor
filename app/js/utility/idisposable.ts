export interface IDisposable
{
	isDisposed: boolean;
	
	dispose(): void;
}