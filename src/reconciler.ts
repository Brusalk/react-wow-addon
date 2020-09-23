import { Component } from './component';
import { InternalElement, TEXT_ELEMENT } from './element';
import { cleanupFrame, createFrame, updateFrameProperties } from './wow-utils';

export interface Instance {
  publicInstance?: Component;
  childInstance: Instance | null;
  childInstances: Array<Instance | null>;
  hostFrame: WoWAPI.Region;
  element: InternalElement;
}

let rootInstance: Instance | null = null;

export function render(element: InternalElement, container: WoWAPI.Region) {
  const prevInstance = rootInstance;
  const nextInstance = reconcile(container, prevInstance, element);
  rootInstance = nextInstance;
}

export function reconcile(
  parentFrame: WoWAPI.Region, instance: Instance | null,
  element: InternalElement | null): Instance | null {
  if (!instance) {
    // Create instance
    assert(element, 'element should not be null')
    return instantiate(element!, parentFrame);
  } else if (!element) {
    // Remove instance
    cleanupFrames(instance);
    return null;
  } else if (instance.element.type !== element.type) {
    // Replace instance
    const newInstance = instantiate(element, parentFrame);
    cleanupFrames(instance);
    return newInstance;
  } else if (typeof element.type === 'string') {
    // Update host element
    updateFrameProperties(
      instance.hostFrame, instance.element.props, element.props);
    instance.childInstances = reconcileChildren(instance, element);
    instance.element = element;
    return instance;
  } else if (instance.publicInstance) {
    // print('reconcile composite', (element.type as any).name, stringify(element.props));
    // Update composite instance
    instance.publicInstance.props = element.props;
    const childElement = instance.publicInstance.render();
    const oldChildInstance = instance.childInstance;
    const childInstance =
      reconcile(parentFrame, oldChildInstance, childElement);

    if (!childInstance) {
      throw 'Failed to update composite instance';
    }

    instance.hostFrame = childInstance.hostFrame;
    instance.childInstance = childInstance;
    instance.element = element;
    return instance;
  } else {
    throw 'Reconciler catch all error';
  }
}

function cleanupFrames(instance: Instance) {
  // TODO: composite objects need special cleanup, this should be part of reconcile
  if (instance.childInstances) {
    instance.childInstances.forEach(child => child && cleanupFrames(child));
  }
  if (instance.childInstance) {
    cleanupFrames(instance.childInstance);
  }
  cleanupFrame(instance.hostFrame);
}

function reconcileChildren(instance: Instance, element: InternalElement) {
  const hostFrame = instance.hostFrame;
  const childInstances = instance.childInstances;
  const nextChildElements = element.props.children || [];
  const newChildInstances = [];
  const count = Math.max(childInstances.length, nextChildElements.length);
  for (let i = 0; i < count; i++) {
    const childInstance = childInstances[i];
    const childElement = nextChildElements[i];
    const newChildInstance = reconcile(hostFrame, childInstance, childElement);
    newChildInstances.push(newChildInstance);
  }
  return newChildInstances.filter(instance => instance != null);
}

function instantiate(
  element: InternalElement, parentFrame: WoWAPI.Region): Instance {
  const { type, props } = element;

  if (typeof type === 'string') {
    if (type === TEXT_ELEMENT) {
      throw 'Cannot create inline text, yet';
    }
    // print('instantiate', type, stringify(props));

    // Instantiate host element
    const frame = createFrame(type, parentFrame, props);

    updateFrameProperties(frame, {}, props);

    const childElements = props.children || [];
    const childInstances =
      childElements.map(child => instantiate(child, frame));

    const instance: Instance =
      { hostFrame: frame, element, childInstances, childInstance: null };
    return instance;

  } else {
    // print('instantiate', (type as any).name, stringify(props));
    // Instantiate component element
    const instance = {} as Instance;
    const publicInstance = createPublicInstance(element, instance);
    const childElement = publicInstance.render();
    const childInstance = instantiate(childElement, parentFrame);
    const hostFrame = childInstance.hostFrame;

    const updateProps:
      Partial<Instance> = { hostFrame, element, childInstance, publicInstance };
    Object.assign(instance, updateProps);
    return instance;
  }
}

function createPublicInstance(
  element: InternalElement, internalInstance: Instance) {
  const { type: ComponentType, props } = element;
  if (!ComponentType) {
    throw 'Tried createPublicInstance() with undefined';
  }

  if (typeof ComponentType === 'string') {
    throw 'Tried createPublicInstance() with string';
  }

  const publicInstance = new (ComponentType as any)(props);
  publicInstance.__internalInstance = internalInstance;
  return publicInstance;
}
