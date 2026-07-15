import { Document, Page, View, Text } from "@react-pdf/renderer";
import { DocumentHeader, DocumentFooter, InfoBox, styles } from "@/lib/pdf/layout";
import type { TenantSettings } from "@/lib/data/settings";
import type { ReleasedOrderReportData } from "@/lib/interop/data";

function calculateAge(dob: string | null): string {
  if (!dob) return "-";
  const birth = new Date(dob);
  const years = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return `${years}y`;
}

export function OrderReportDocument({ data, settings }: { data: ReleasedOrderReportData; settings: TenantSettings }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DocumentHeader settings={settings} title="Laboratory Report" meta={`Order #: ${data.orderNumber}`} />

        <View style={styles.section}>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <Text style={{ width: "50%", marginBottom: 3 }}>
              Patient: {data.patient.firstName} {data.patient.lastName}
            </Text>
            <Text style={{ width: "50%", marginBottom: 3 }}>Patient No: {data.patient.patientNumber}</Text>
            <Text style={{ width: "50%", marginBottom: 3 }}>
              Gender / Age: {data.patient.gender ?? "-"} / {calculateAge(data.patient.dateOfBirth)}
            </Text>
            <Text style={{ width: "50%", marginBottom: 3 }}>Order No: {data.orderNumber}</Text>
            <Text style={{ width: "50%", marginBottom: 3 }}>
              Ordered: {data.orderedAt ? new Date(data.orderedAt).toLocaleString() : "-"}
            </Text>
          </View>
        </View>

        {data.tests.map((test) => (
          <View style={styles.section} key={test.orderTestId}>
            <Text style={styles.sectionTitle}>
              {test.testName} ({test.testCode}) · Released{" "}
              {test.releasedAt ? new Date(test.releasedAt).toLocaleString() : "-"}
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.th, { flex: 2 }]}>Parameter</Text>
                <Text style={styles.th}>Result</Text>
                <Text style={styles.th}>Unit</Text>
                <Text style={styles.th}>Reference range</Text>
              </View>
              {test.results.map((r, i) => (
                <View style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt} key={i}>
                  <Text style={[styles.td, { flex: 2 }]}>{r.componentName}</Text>
                  <Text style={styles.td}>
                    {r.valueNumeric ?? r.valueText}
                    {r.flag && r.flag !== "normal" ? ` (${r.flag.replace(/_/g, " ")})` : ""}
                  </Text>
                  <Text style={styles.td}>{r.unit ?? "-"}</Text>
                  <Text style={styles.td}>{r.referenceRange ?? "-"}</Text>
                </View>
              ))}
            </View>
            <InfoBox tone="blue" title="Interpretation">
              <Text style={styles.infoBoxText}>{test.interpretation}</Text>
            </InfoBox>
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.muted}>
            This report was electronically verified and released via {settings.clinic_name ?? "EDOS LMIS"} two-step
            verification.
          </Text>
        </View>

        <DocumentFooter settings={settings} />
      </Page>
    </Document>
  );
}
