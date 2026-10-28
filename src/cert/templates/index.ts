import type { Template } from "../types";
import { emerald } from "./emerald";
import { kids } from "./kids";
import { manuscript } from "./manuscript";
import { night } from "./night";
import { olive } from "./olive";
import { rose } from "./rose";
import { seal } from "./seal";
import { zellige } from "./zellige";

/** In the order the picker shows them. */
export const TEMPLATES: readonly Template[] = [rose, emerald, manuscript, night, olive, zellige, seal, kids];
