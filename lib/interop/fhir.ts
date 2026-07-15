import type { ReleasedResultData } from "./data";

// Minimal HL7 FHIR R4 Bundle (DiagnosticReport + Observations) for a
// released lab result. This is an export-only representation intended as
// the standard first step before wiring to a live FHIR server / EMR
// (KenyaEMR, OpenMRS) — no external system is connected yet.
export function buildFhirBundle(data: ReleasedResultData) {
  const patientId = `patient-${data.patient.id}`;
  const reportId = `diagnostic-report-${data.orderTestId}`;

  const patientResource = {
    resourceType: "Patient",
    id: patientId,
    identifier: [{ system: "urn:edoslmis:patient-number", value: data.patient.patientNumber }],
    name: [{ family: data.patient.lastName, given: [data.patient.firstName] }],
    gender: data.patient.gender ?? undefined,
    birthDate: data.patient.dateOfBirth ?? undefined,
  };

  const observations = data.results.map((r, i) => ({
    resourceType: "Observation",
    id: `observation-${data.orderTestId}-${i}`,
    status: "final",
    code: { text: r.componentName },
    subject: { reference: `Patient/${patientId}` },
    valueQuantity:
      r.valueNumeric !== null
        ? { value: r.valueNumeric, unit: r.unit ?? undefined }
        : undefined,
    valueString: r.valueNumeric === null ? (r.valueText ?? undefined) : undefined,
    interpretation:
      r.flag && r.flag !== "normal"
        ? [{ text: r.flag.replace(/_/g, " ") }]
        : undefined,
  }));

  const diagnosticReport = {
    resourceType: "DiagnosticReport",
    id: reportId,
    status: "final",
    code: { text: data.testName, coding: data.testCode ? [{ code: data.testCode }] : undefined },
    subject: { reference: `Patient/${patientId}` },
    identifier: [{ system: "urn:edoslmis:order-number", value: data.orderNumber }],
    effectiveDateTime: data.orderedAt || undefined,
    issued: data.releasedAt || undefined,
    result: observations.map((o) => ({ reference: `Observation/${o.id}` })),
  };

  return {
    resourceType: "Bundle",
    type: "collection",
    entry: [
      { resource: patientResource },
      { resource: diagnosticReport },
      ...observations.map((resource) => ({ resource })),
    ],
  };
}
