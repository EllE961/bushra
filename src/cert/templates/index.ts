import type { Template } from "../types";
import { arch } from "./arch";
import { desert } from "./desert";
import { emerald } from "./emerald";
import { kids } from "./kids";
import { lavender } from "./lavender";
import { manuscript } from "./manuscript";
import { night } from "./night";
import { noir } from "./noir";
import { olive } from "./olive";
import { rose } from "./rose";
import { sea } from "./sea";
import { seal } from "./seal";
import { space } from "./space";
import { zellige } from "./zellige";

/** In the order the picker shows them. */
export const TEMPLATES: readonly Template[] = [
  rose,
  emerald,
  arch,
  night,
  sea,
  manuscript,
  lavender,
  noir,
  desert,
  olive,
  zellige,
  seal,
  kids,
  space,
];
