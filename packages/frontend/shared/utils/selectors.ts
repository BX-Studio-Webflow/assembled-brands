/**
 * Portable selector helpers - transferable to any project
 *
 * This is a standalone version of the selector helpers without Finsweet-specific dependencies.
 * It can be used in any project that needs to query DOM elements by data attributes.
 */

/**
 * Type definition for component elements (array of string literals)
 */
export type ComponentElementsDefinition = readonly string[];

/**
 * Type definition for component settings
 */
export type ComponentSettingsDefinition = {
  [name: string]: {
    key: string;
    values?: {
      [valueKey: string]: string;
    };
  };
};

/**
 * Optional scripts provider interface
 * If provided, scripts will be checked for attributes when not found on elements
 */
export interface ScriptsProvider {
  scripts: HTMLScriptElement[];
}

/**
 * Options for selector generation
 */
export interface SelectorOptions {
  /**
   * Optional scripts provider to check for attribute values
   * Defaults to checking window.fsComponents?.scripts if available
   */
  scriptsProvider?: ScriptsProvider | null;
}

/**
 * Standalone queryElement helper - a typed wrapper around document.querySelector
 * @param selector CSS selector string
 * @param scope The scope to query from. Defaults to `document`.
 * @returns The first element matching the selector, or null if not found
 */
export const queryElement = <E extends Element = HTMLElement>(
  selector: string,
  scope: ParentNode = document
): E | null => {
  return scope.querySelector<E>(selector);
};

/**
 * Standalone queryAllElements helper - a typed wrapper around document.querySelectorAll
 * @param selector CSS selector string
 * @param scope The scope to query from. Defaults to `document`.
 * @returns An array of all elements matching the selector
 */
export const queryAllElements = <E extends Element = HTMLElement>(
  selector: string,
  scope: ParentNode = document
): E[] => {
  const elements = scope.querySelectorAll<E>(selector);
  return [...Array.from(elements)];
};

/**
 * Standalone getClosestElement helper - a typed wrapper around element.closest
 * @param element The element to start searching from
 * @param selector CSS selector string
 * @returns The first ancestor element matching the selector, or null if not found
 */
export const getClosestElement = <E extends Element = HTMLElement>(
  element: Element,
  selector: string
): E | null => {
  return element.closest<E>(selector);
};

/**
 * Standalone getAttribute helper - gets an attribute value with optional traversal
 * @param element The element to get the attribute from
 * @param attributeName The name of the attribute
 * @param selector Optional CSS selector to find the closest ancestor with the attribute
 * @param traverse Whether to traverse the DOM tree to find the closest ancestor. Defaults to `true`.
 * @returns The attribute value, or null if not found
 */
export const getAttribute = (
  element: Element | null,
  attributeName: string,
  selector?: string,
  traverse = true
): string | null => {
  if (!element) return null;

  const targetElement = traverse && selector ? element.closest(selector) : element;

  return targetElement?.getAttribute(attributeName) || null;
};

/**
 * Standalone hasAttributeValue helper - checks if an element has a specific attribute value
 * @param element The element to check
 * @param attributeName The name of the attribute
 * @param value The value to check for
 * @returns True if the element has the attribute with the specified value, false otherwise
 */
export const hasAttributeValue = (
  element: Element,
  attributeName: string,
  value: string
): boolean => {
  return element.getAttribute(attributeName) === value;
};

/**
 * Standalone getInstance helper - gets the instance value from an element's closest ancestor
 * @param element The element to get the instance from
 * @param instanceAttributeName The name of the instance attribute (e.g., 'fs-component-instance')
 * @returns The instance value, or null if not found
 */
export const getInstance = (element: Element, instanceAttributeName: string): string | null => {
  const instanceHolder = element.closest(`[${instanceAttributeName}]`);
  if (!instanceHolder) return null;

  return instanceHolder.getAttribute(instanceAttributeName);
};
