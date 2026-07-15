export type ComponentInterpretationInput = {
  componentName: string;
  valueNumeric: number | null;
  valueText: string | null;
  unit: string | null;
  flag: string | null;
  referenceRange: string | null;
};

export function componentInterpretation(c: ComponentInterpretationInput): string | null {
  if (!c.flag || c.flag === "normal") return null;

  const value = c.valueNumeric ?? c.valueText ?? "-";
  const unitSuffix = c.unit ? ` ${c.unit}` : "";
  const range = c.referenceRange ?? "not defined";

  switch (c.flag) {
    case "low":
      return `${c.componentName} is low at ${value}${unitSuffix} (reference range: ${range}).`;
    case "high":
      return `${c.componentName} is high at ${value}${unitSuffix} (reference range: ${range}).`;
    case "critical_low":
      return `${c.componentName} is critically low at ${value}${unitSuffix} (reference range: ${range}). Immediate clinical attention advised.`;
    case "critical_high":
      return `${c.componentName} is critically high at ${value}${unitSuffix} (reference range: ${range}). Immediate clinical attention advised.`;
    case "abnormal":
      return `${c.componentName} result (${value}${unitSuffix}) is outside expected parameters.`;
    default:
      return null;
  }
}

export function testInterpretation(components: ComponentInterpretationInput[]): string {
  const lines = components.map(componentInterpretation).filter((line): line is string => line !== null);
  return lines.length > 0 ? lines.join("\n") : "All parameters within normal range.";
}
