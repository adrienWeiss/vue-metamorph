import { voidElements } from './stringify';
import * as AST from './ast';

/**
 * Traverses a Node tree and sets the `parent` property for each descendent
 * @param node - The Node to traverse
 * @public
 */
export function setParents(node: AST.Node) {
  AST.traverseNodes(node, {
    enterNode(innerNode, parent) {
      innerNode.parent = parent;
    },
    leaveNode() {
      // empty
    },
  });
}

/**
 * Creates a new VAttribute node
 * @param key - A VIdentifier node
 * @param value - A VLiteral node, or null
 * @returns A new VAttribute node
 * @public
 */
export function vAttribute(
  key: AST.VAttribute['key'],
  value: AST.VAttribute['value'],
): AST.VAttribute {
  return {
    type: 'VAttribute',
    directive: false,
    key,
    value,
    // @ts-expect-error Parent is not known yet
    parent: undefined,
  };
}

/**
 * Creates a new VDirective node
 *
 * Note that VDirective has the type 'VAttribute', with `directive: true`
 * @param key - The VDirectiveKey node
 * @param value - A VExpressionContainer node, or null
 * @returns A new VDirective node
 * @public
 */
export function vDirective(
  key: AST.VDirective['key'],
  value: AST.VDirective['value'],
): AST.VDirective {
  return {
    type: 'VAttribute',
    directive: true,
    key,
    value,
    // @ts-expect-error Parent is not known yet
    parent: undefined,
  };
}

/**
 * Creates a new VDirectiveKey node
 *
 * @example
 * ```
 * v-name:argument.modifier1.modifier2
 * ```
 *
 * @param name - A VIdentifier node
 * @param argument - The directive argument, or null
 * @param modifiers - The directive modifiers
 * @returns A new VDirectiveKey node
 * @public
 */
export function vDirectiveKey(
  name: AST.VDirectiveKey['name'],
  argument: AST.VDirectiveKey['argument'] = null,
  modifiers: AST.VDirectiveKey['modifiers'] = [],
): AST.VDirectiveKey {
  return {
    type: 'VDirectiveKey',
    name,
    argument,
    modifiers,
    // @ts-expect-error Parent is not known yet
    parent: undefined,
  };
}

/**
 * Creates a new VDocumentFragment node
 * @param children - The document's children
 * @returns A new VDocumentFragment node
 * @public
 */
export function vDocumentFragment(
  children: AST.VDocumentFragment['children'],
): AST.VDocumentFragment {
  return {
    type: 'VDocumentFragment',
    children,
    // @ts-expect-error Parent is not known yet
    parent: undefined,
  };
}

/**
 * Creates a new VEndTag node
 * @returns A new VEndTag node
 * @public
 */
export function vEndTag(): AST.VEndTag {
  return {
    type: 'VEndTag',
    // @ts-expect-error Parent is not known yet
    parent: undefined,
  };
}

/**
 * Creates a new VElement node
 * @param name - The name of the element (Ex. `div` or `MyComponent`)
 * @param startTag - A VStartTag node
 * @param children - Child elements, if the VStartTag is not self-closing
 * @param namespace - The element's namespace
 * @returns A new VElement node
 * @public
 */
export function vElement(
  name: string,
  startTag: AST.VStartTag,
  children: AST.VElement['children'],
  namespace: AST.VElement['namespace'] = 'http://www.w3.org/1999/xhtml',
): AST.VElement {
  return {
    type: 'VElement',
    name,
    rawName: name,
    children,
    startTag,
    namespace,
    // @ts-expect-error Parent is not known yet
    parent: undefined,
    endTag: startTag.selfClosing || voidElements[name] ? null : vEndTag(),
  };
}

/**
 * Creates a new VExpressionContainer node
 * @param expression - The expression in the container
 * @returns A new VExpressionContainer node
 * @public
 */
export function vExpressionContainer(expression: AST.VExpressionContainer['expression']): AST.VExpressionContainer {
  return {
    type: 'VExpressionContainer',
    references: [],
    expression,

    // @ts-expect-error Parent is not known yet
    parent: undefined,
  };
}

/**
 * Creates a new VForExpression node
 * @example
 * ```
 * v-for="`left` in `right`"
 * ```
 * @param left - The pattern on the left side of `in`
 * @param right - The expression node on the right side of `in`
 * @returns A new VForExpression node
 * @public
 */
export function vForExpression(
  left: AST.VForExpression['left'],
  right: AST.VForExpression['right'],
): AST.VForExpression {
  return {
    type: 'VForExpression',
    left,
    right,
    // @ts-expect-error Parent is not known yet
    parent: undefined,
  };
}

/**
 * Creates a new VIdentifier node
 *
 * @param name - The identifier name
 * @param rawName - If the name should differ from what gets stringified, the value to print
 * @returns A new VIdentifier node
 * @public
 */
export function vIdentifier(
  name: AST.VIdentifier['name'],
  rawName: AST.VIdentifier['rawName'] = name,
): AST.VIdentifier {
  return {
    type: 'VIdentifier',
    name,
    rawName,
    // @ts-expect-error Parent is not known yet
    parent: undefined,
  };
}

/**
 * Creates a new VLiteral node
 * @param value - Text value
 * @returns A new VLiteral node
 * @public
 */
export function vLiteral(
  value: AST.VLiteral['value'],
): AST.VLiteral {
  return {
    type: 'VLiteral',
    // @ts-expect-error Parent is not known yet
    parent: undefined,
    value,
  };
}

/**
 * Creates a new VStartTag node
 * @param attributes - Attributes or Directives
 * @param selfClosing - Whether the tag is self-closing. Void elements should not be self-closing
 * @returns A new VStartTag node
 * @public
 */
export function vStartTag(
  attributes: AST.VStartTag['attributes'],
  selfClosing: AST.VStartTag['selfClosing'],
): AST.VStartTag {
  return {
    type: 'VStartTag',
    attributes,
    // @ts-expect-error Parent is not known yet
    parent: undefined,
    selfClosing,
  };
}

/**
 * Create a new VText node
 * @param value - Text value
 * @returns A new VText node
 * @public
 */
export function vText(
  value: AST.VText['value'],
): AST.VText {
  return {
    type: 'VText',
    // @ts-expect-error Parent is not known yet
    parent: undefined,
    value,
  };
}

/**
 * Create a new VOnExpression node
 * @param body - Expression body
 * @returns A VOnExpression node
 * @public
 */
export function vOnExpression(
  body: AST.VOnExpression['body'],
): AST.VOnExpression {
  return {
    type: 'VOnExpression',
    // @ts-expect-error Parent is not known yet
    parent: undefined,
    body,
  };
}
