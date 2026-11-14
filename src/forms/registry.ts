import { bapp } from "./defs/bapp";
import { fdia } from "./defs/fdia";
import { fpp } from "./defs/fpp";
import { ik } from "./defs/ik";
import { li } from "./defs/li";
import { mom } from "./defs/mom";
import { pr } from "./defs/pr";
import { rkd } from "./defs/rkd";
import type { FormDef } from "./types";

/** All generic forms, in FRM.IT number order. BAST (FRM.IT.003) has its own dedicated pages. */
export const FORMS: FormDef[] = [pr, fpp, bapp, fdia, rkd, ik, li, mom];

export function getForm(id: string): FormDef | undefined {
  return FORMS.find((f) => f.id === id);
}
