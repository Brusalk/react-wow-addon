/** @noSelfInFile */

declare namespace JSX {
  interface PointDefinition {
    point: WoWAPI.Point;
    relativePoint?: WoWAPI.Point;
    relativeFrame?: WoWAPI.Region | string;
    x?: number;
    y?: number;
  }

  type Point = PointDefinition | WoWAPI.Point;

  type Color4 = [number, number, number, number];
  type Tuple<T = number> = [T, T];
  type Size = Tuple;
  type Font = [string, number];

  interface BaseProps {
    key?: string;
    children?: any;
  }

  interface BaseFrameProps extends BaseProps {
    name?: string;
    inheritsFrom?: string;
    Width?: number;
    Height?: number;
    Size?: Size;
    Points?: Point[];
    Point?: Point;
    Backdrop?: WoWAPI.Backdrop;
    BackdropBorderColor?: Color4;
    BackdropColor?: Color4;

    OnUpdate?: (this: void, frame: WoWAPI.Frame, secondsElapsed: number) => void;

    Clickable?: WoWAPI.MouseButton[];
    OnClick?: (this: void, frame: WoWAPI.Frame, button: WoWAPI.MouseButton, down: boolean) => void;

    Draggable?: WoWAPI.MouseButton[];
    Movable?: boolean;
    OnDragStart?: (this: void, frame: WoWAPI.Frame, button: WoWAPI.MouseButton, down: boolean) => void;
    OnDragStop?: (this: void, frame: WoWAPI.Frame, button: WoWAPI.MouseButton, down: boolean) => void;
  }

  interface LayeredRegionProps extends BaseFrameProps {
    VertexColor?: Color4;
    DrawLayer?: WoWAPI.Layer | [WoWAPI.Layer, number];
  }

  interface StatusBarProps extends BaseFrameProps {
    MinMaxValues?: Tuple;
    Value?: number;
    StatusBarTexture?: string;
    StatusBarColor?: Color4;
  }

  interface TextureProps extends LayeredRegionProps {
    Texture?: WoWAPI.TexturePath;
  }

  interface FontInstanceProps extends LayeredRegionProps {
    Font?: Font;
  }

  interface FontStringProps extends FontInstanceProps {
    Text?: string;
    JustifyH?: WoWAPI.HorizontalAlign;
    JustifyV?: WoWAPI.VerticalAlign;
    TextColor?: Color4;
  }

  interface IntrinsicElements {
    button: BaseFrameProps;
    'color-select': BaseFrameProps;
    cooldown: BaseFrameProps;
    'edit-box': BaseFrameProps;
    frame: BaseFrameProps;
    'game-tooltip': BaseFrameProps;
    'message-frame': BaseFrameProps;
    minimap: BaseFrameProps;
    model: BaseFrameProps;
    'scroll-frame': BaseFrameProps;
    'scrolling-message-frame': BaseFrameProps;
    'simple-html': BaseFrameProps;
    slider: StatusBarProps;
    'status-bar': StatusBarProps;

    // Other things
    'font-string': FontStringProps;
    texture: TextureProps;
  }
}
