/**
 * Calculates the time required to comfortably read a given text in ms.
 * 
 * @param text The text for which to calculate the reading time.
 */
export function readingTime(text: string)
{
	var wordCount = text.split(/\W+/g).filter(s => s.match(/^\W*$/) == null).length;
	var baseLength = wordCount < 10 ? 2000 : 3000;
	return baseLength + (wordCount * 200);
}