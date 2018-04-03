declare interface Window
{
	ResizeObserver: ResizeObserver;
}

declare type ResizeObserverCallback = (entries?: ResizeObserverEntry[], observer?: ResizeObserver) => void;

declare class ResizeObserver
{
	constructor(callback: ResizeObserverCallback);

	observe(target: Element): void;
	unobserve(target: Element): void;
	disconnect(): void;
}