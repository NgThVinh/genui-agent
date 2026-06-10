import type { GenUIComponentDef } from "../../types/public";
import { Chart } from "./Chart";
import { Form } from "./Form";
import { MapView } from "./Map";
import { Metric } from "./Metric";
import { Table } from "./Table";

/** The Core-5 typed components the agent can drive by props. */
export const builtinComponents: Record<string, GenUIComponentDef> = {
  metric: { render: Metric },
  chart: { render: Chart },
  table: { render: Table },
  map: { render: MapView },
  form: { render: Form },
};
