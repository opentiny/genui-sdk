const schemaHostNodes = new WeakSet<Node>();

/** Host element of a schema `createComponent` — owned by ng-content projection. */
export function markSchemaHostNode(node: Node | null | undefined): void {
  if (node) {
    schemaHostNodes.add(node);
  }
}

/**
 * `EmbeddedViewRef.rootNodes` walks nested view containers, so it also lists
 * elements libraries later insert next to a schema host. Those are not schema
 * children and must not be adopted into the parent's projection slot.
 */
export function isSchemaProjectionNode(node: Node, alreadyProjected: Set<Node>): boolean {
  if (alreadyProjected.has(node)) {
    return true;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return true;
  }
  return schemaHostNodes.has(node);
}
