export interface TreeNode<P, C>
{
	/** The parent node if any. */
	parent: P;

	/** This node's immediate children if any. */
	children: C[];
}