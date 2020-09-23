

type Props = Record<string, any>;

const frameCache: Record<string, WoWAPI.Region[]> = {
};

function getCache(type: string): WoWAPI.Region | undefined {
  // if (frameCache[type]) {
  //   return frameCache[type].length ? frameCache[type].pop() : undefined;
  // }
  return undefined;
}

function setCache(frame: WoWAPI.Region) {
  const type = frame.GetObjectType();
  print('store cache', type);
  if (frameCache[type] && frameCache[type].length) {
    frameCache[type].push(frame);
  } else {
    frameCache[type] = [frame];
  }
}

export function createFrame(
  jsxType: string, parentFrame: WoWAPI.Region,
  props: Props): WoWAPI.Region {
  const frameType = pascalCase(jsxType);

  let frame = getCache(frameType);

  if (frame) {
    print('got frame from cache', frameType, frame, 'parent:', parentFrame);
    frame.SetParent(parentFrame);
    frame.Show();
    return frame;
  }

  if (frameType === 'FontString') {
    frame = (parentFrame as WoWAPI.Frame)
      .CreateFontString(props.name, props.DrawLayer || 'ARTWORK', props.inheritsFrom);
  } else if (frameType === 'Texture') {
    frame = (parentFrame as WoWAPI.Frame)
      .CreateTexture(props.name, props.DrawLayer || 'ARTWORK', props.inheritsFrom);
  } else {
    frame =
      CreateFrame(frameType as WoWAPI.FrameType, props.name, parentFrame, props.inheritsFrom || "BackdropTemplate") as
      WoWAPI.Frame;
  }
  // frame.SetParent(parentFrame);
  print('created frame:', frameType);
  return frame;
}

export function cleanupFrame(frame: WoWAPI.Region) {
  print('cleaning up frame', frame.GetObjectType(), frame);
  frame.Hide();
  frame.ClearAllPoints();
  if (frame.GetObjectType() as string === 'Texture' ||
    frame.GetObjectType() as string === 'FontString') {
    frame.SetParent(UIParent);
  } else {
    frame.SetParent(null);
  }
  setCache(frame);
}

const isEvent = (name: string) => name.startsWith('On');
const isStandardProperty = (name: string) => !isEvent(name) &&
  !isOrderedProperty(name) && name !== 'children' && name !== 'Points' && name !== 'Point' &&
  name !== 'name' && name !== 'DrawLayer' && name !== 'inheritsFrom' && name !== 'Clickable' &&
  name !== 'Draggable';

/**
 * These properties must be set _before_ their other properties e.g. Background
 * must be set before BackgroundColor
 */
const isOrderedProperty = (name: string) => name === 'Font' ||
  name === 'Background' || name === 'Texture' || name === 'Backdrop';
/**
 * These properties take table values, which should be set verbatim. Array
 * values will apply each item as an argument to SetX. These values should not
 * be interpreted as arrays.
 */
const isTableValue = (name: string) => name === 'Backdrop';

export function updateFrameProperties(
  frame: WoWAPI.Region, prevProps: Props, nextProps: Props) {
  updateFramePoints(frame, nextProps);
  updateFrameLayer(frame, nextProps);
  updateFrameEvents(frame, prevProps, nextProps);
  updateOrderSpecificProperties(frame, prevProps, nextProps);
  updateRemainingProperties(frame, prevProps, nextProps);
}

function updateOrderSpecificProperties(
  frame: WoWAPI.Region, prevProps: Props, nextProps: Props) {
  // Remove properties that are no longer specified
  Object.keys(prevProps)
    .filter(key => isOrderedProperty(key) && !nextProps[key])
    .forEach(key => {
      attemptSetProperty(frame, key, null);
    });
  // Set properties
  Object.keys(nextProps).filter(isOrderedProperty).forEach(key => {
    attemptSetProperty(frame, key, nextProps[key]);
  });
}

function updateRemainingProperties(
  frame: WoWAPI.Region, prevProps: Props, nextProps: Props) {
  // Remove properties that are no longer specified
  Object.keys(prevProps)
    .filter(key => isStandardProperty(key) && !nextProps[key])
    .forEach(key => {
      attemptSetProperty(frame, key, null);
    });
  // Set properties
  Object.keys(nextProps).filter(isStandardProperty).forEach(key => {
    attemptSetProperty(frame, key, nextProps[key]);
  });
}

function updateFrameEvents(
  frame: WoWAPI.Region, prevProps: Props, nextProps: Props) {
  // Detach removed event listeners
  Object.keys(prevProps)
    .filter(key => isEvent(key) && !nextProps[key])
    .forEach(event => {
      (frame as WoWAPI.Frame).SetScript(event as WoWAPI.Event.OnAny, undefined);
    });

  if (nextProps['Clickable']) {
    (frame as any).RegisterForClicks('RightButton');
  }
  if (nextProps['Draggable']) {
    (frame as any).RegisterForDrag(...nextProps['Draggable']);
  }

  // Add new event listeners
  Object.keys(nextProps)
    .filter(key => isEvent(key) && prevProps[key] !== nextProps[key])
    .forEach(event => {
      // print('attaching event', event);
      (frame as WoWAPI.Frame).SetScript(event as WoWAPI.Event.OnAny, nextProps[event]);
    });
}

/** Handle frame points, size to parent unless specified. */
function updateFramePoints(frame: WoWAPI.Region, nextProps: JSX.BaseFrameProps) {
  frame.ClearAllPoints();
  if (nextProps.Point) {
    setPoint(frame, nextProps.Point);
    return;
  }
  if (nextProps.Points) {
    const points = nextProps.Points;
    points.forEach(pointDef => setPoint(frame, pointDef));
  } else {
    // Fill to parent
    frame.SetAllPoints();
  }
}

/** Handle frame points, size to parent unless specified. */
function updateFrameLayer(frame: WoWAPI.Region, nextProps: JSX.LayeredRegionProps) {
  const region = frame as WoWAPI.LayeredRegion;
  const layer = nextProps.DrawLayer;

  if (!layer || typeof region.SetDrawLayer !== 'function') {
    return;
  }

  if (typeof layer === 'string') {
    region.SetDrawLayer(layer, 0);
    return;
  }

  region.SetDrawLayer(layer[0] as WoWAPI.Layer, layer[1]);
}

/** Create a point declaration */
export function P(
  point: WoWAPI.Point, x?: number, y?: number, relativePoint?: WoWAPI.Point,
  relativeFrame?: WoWAPI.Region): JSX.PointDefinition {
  // TODO: memoize for perf
  return { point, relativePoint, relativeFrame, x, y };
}

function setPoint(frame: WoWAPI.Region, pointDef: JSX.Point) {
  if (typeof pointDef === 'string') {
    frame.SetPoint(pointDef);
  } else {
    const { point, relativePoint, relativeFrame, x, y } = pointDef;
    const relativeTo = relativePoint || point;
    // print('setPoint', Object.keys(pointDef).join(', '));
    if (relativeFrame) {
      frame.SetPoint(point, relativeFrame, relativeTo, x || 0, y || 0);
    } else {
      const parent = frame.GetParent() as WoWAPI.Region;
      frame.SetPoint(point, parent, relativeTo, x || 0, y || 0);
    }
  }
}

function attemptSetProperty(frame: WoWAPI.Region, key: string, value: any) {
  const region = frame as any as Record<string, (v: any) => void>;
  const setter = `Set${key}`;
  const setterFn = region[setter];
  assert(setterFn, `Tried to use ${setter} and it did not exist on ${region}`);

  if (setterFn && typeof setterFn == 'function') {
    if (typeof value === 'string' || typeof value === 'number' ||
      typeof value === 'boolean' || isTableValue(key)) {
      region[setter](value);
    } else {
      // print( `calling ${setter} with array elements as args:`,
      // (value as any[]).join(', '));
      setterFn.apply(region, value);
    }
  }
}

export function sentenceCase(str: string) {
  return str[0].toUpperCase() + str.slice(1).toLowerCase();
}

export function pascalCase(kebabCase: string) {
  return kebabCase.split('-').map(sentenceCase).join('');
}
