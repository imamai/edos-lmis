import type { ReleasedResultData } from "./data";

const FIELD_SEP = "|";
const SEGMENT_SEP = "\r";

function hl7Timestamp(iso: string): string {
  if (!iso) return "";
  return iso.replace(/[-:]/g, "").slice(0, 14);
}

function hl7Sex(gender: string | null): string {
  if (gender === "male") return "M";
  if (gender === "female") return "F";
  return "U";
}

// Minimal HL7 v2.5 ORU^R01 (unsolicited observation result) message for a
// released lab result. Export-only — no live interface engine/MLLP
// connection is wired up, since there is no external HL7 receiver
// configured yet. This is the standard message shape KenyaEMR/OpenMRS
// HL7 listeners expect as an integration starting point.
export function buildHl7OruMessage(data: ReleasedResultData): string {
  const now = hl7Timestamp(new Date().toISOString());
  const messageControlId = data.orderTestId.replace(/-/g, "").slice(0, 20);

  const segments: string[] = [];

  segments.push(
    ["MSH", "^~\\&", "EDOSLMIS", "EDOSCENTRE", "", "", now, "", "ORU^R01", messageControlId, "P", "2.5"].join(FIELD_SEP)
  );

  segments.push(
    [
      "PID",
      "1",
      "",
      data.patient.patientNumber,
      "",
      `${data.patient.lastName}^${data.patient.firstName}`,
      "",
      hl7Timestamp(data.patient.dateOfBirth ?? ""),
      hl7Sex(data.patient.gender),
    ].join(FIELD_SEP)
  );

  segments.push(
    [
      "OBR",
      "1",
      data.orderNumber,
      data.orderNumber,
      `${data.testCode}^${data.testName}`,
      "",
      hl7Timestamp(data.orderedAt),
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "F",
    ].join(FIELD_SEP)
  );

  data.results.forEach((r, i) => {
    segments.push(
      [
        "OBX",
        String(i + 1),
        r.valueNumeric !== null ? "NM" : "ST",
        r.componentName,
        "",
        r.valueNumeric !== null ? String(r.valueNumeric) : (r.valueText ?? ""),
        r.unit ?? "",
        "",
        r.flag && r.flag !== "normal" ? r.flag.toUpperCase() : "",
        "",
        "",
        "F",
      ].join(FIELD_SEP)
    );
  });

  return segments.join(SEGMENT_SEP) + SEGMENT_SEP;
}
