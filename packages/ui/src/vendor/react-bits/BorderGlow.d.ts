// Types for the unchanged React Bits source in BorderGlow.jsx.
import type { ReactNode } from "react";

export interface BorderGlowProps {
  children?: ReactNode;
  className?: string;
  /** How close to an edge the pointer must be for the glow to show (0-100). */
  edgeSensitivity?: number;
  /** "H S L" values, e.g. "40 80 80". */
  glowColor?: string;
  /** Hex colour of the card surface. */
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  animated?: boolean;
  /** Three hex colours for the mesh-gradient border. */
  colors?: readonly string[];
  fillOpacity?: number;
}

declare const BorderGlow: (props: BorderGlowProps) => JSX.Element;
export default BorderGlow;
