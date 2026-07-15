import { Document, Page, View, Text } from "@react-pdf/renderer";
import { DocumentHeader, DocumentFooter, styles } from "@/lib/pdf/layout";
import type { TenantSettings } from "@/lib/data/settings";
import type { RfqDetail } from "@/lib/data/procurement";

export function RfqDocument({ rfq, settings }: { rfq: RfqDetail; settings: TenantSettings }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DocumentHeader
          settings={settings}
          title="Request for Quotation"
          meta={`RFQ #: ${rfq.rfq_number}${rfq.revision > 0 ? `  ·  Rev. ${rfq.revision}` : ""}`}
          extraMeta={rfq.expected_date ? `Needed by: ${new Date(rfq.expected_date).toLocaleDateString()}` : undefined}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Please quote for the following commodities</Text>
          {rfq.notes && <Text style={styles.muted}>{rfq.notes}</Text>}
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, { flex: 3 }]}>Commodity</Text>
              <Text style={styles.th}>Quantity requested</Text>
            </View>
            {rfq.lines.map((line, i) => (
              <View style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt} key={line.id}>
                <Text style={[styles.td, { flex: 3 }]}>
                  {line.item?.name} ({line.item?.code})
                </Text>
                <Text style={styles.td}>{line.quantity_requested} {line.item?.unit_of_measure}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={[styles.muted, { marginTop: 12 }]}>
          Please reply with your pricing for the items above by the date indicated. This is a request for
          pricing only and does not constitute an order.
        </Text>

        <DocumentFooter settings={settings} />
      </Page>
    </Document>
  );
}
