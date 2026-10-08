// Types for the unchanged React Bits source in FaultyTerminal.jsx.
import type { CSSProperties, HTMLAttributes } from "react";

export interface FaultyTerminalProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
  scale?: number;
  gridMul?: readonly [number, number];
  digitSize?: number;
  timeScale?: number;
  pause?: boolean;
  scanlineIntensity?: number;
  glitchAmount?: number;
  flickerAmount?: number;
  noiseAmp?: number;
  chromaticAberration?: number;
  dither?: number | boolean;
  curvature?: number;
  /** Hex colour. */
  tint?: string;
  mouseReact?: boolean;
  mouseStrength?: number;
  dpr?: number;
  pageLoadAnimation?: boolean;
  brightness?: number;
  lightMode?: boolean;
  className?: string;
  style?: CSSProperties;
}

declare const FaultyTerminal: (props: FaultyTerminalProps) => JSX.Element;
export default FaultyTerminal;
