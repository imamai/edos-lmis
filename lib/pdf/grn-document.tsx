import { Document, Page, View, Text } from "@react-pdf/renderer";
import { DocumentHeader, DocumentFooter, formatMoney, styles } from "@/lib/pdf/layout";
import type { TenantSettings } from "@/lib/data/settings";
import type { PurchaseOrderDetail } from "@/lib/data/procurement";

export function GrnDocument({ po, settings }: { po: PurchaseOrderDetail; settings: TenantSettings }) {
  const currency = settings.currency_code;
  const receivedLines = po.lines.filter((line) => line.quantity_received > 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DocumentHeader
          settings={settings}
          title="Goods Received Note"
          meta={`PO #: ${po.po_number}`}
          extraMeta={`Status: ${po.status.replace(/_/g, " ")}`}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Supplier</Text>
          <Text>{po.supplier?.name ?? "-"}</Text>
          {po.supplier?.contact_person && <Text style={styles.muted}>Attn: {po.supplier.contact_person}</Text>}
          <Text style={styles.muted}>
            {[po.supplier?.phone, po.supplier?.email].filter(Boolean).join("  ·  ")}
          </Text>
          {po.supplier_invoice_number && (
            <Text style={styles.muted}>Supplier Invoice #: {po.supplier_invoice_number}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commodities received</Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, { flex: 3 }]}>Commodity</Text>
              <Text style={styles.th}>Ordered</Text>
              <Text style={styles.th}>Received</Text>
              <Text style={styles.th}>Outstanding</Text>
              <Text style={styles.th}>Unit cost</Text>
            </View>
            {receivedLines.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={[styles.td, { flex: 3 }]}>No commodities received against this order yet.</Text>
              </View>
            ) : (
              receivedLines.map((line, i) => (
                <View style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt} key={line.id}>
                  <Text style={[styles.td, { flex: 3 }]}>
                    {line.item?.name} ({line.item?.code})
                  </Text>
                  <Text style={styles.td}>{line.quantity_ordered} {line.item?.unit_of_measure}</Text>
                  <Text style={styles.td}>{line.quantity_received} {line.item?.unit_of_measure}</Text>
                  <Text style={styles.td}>
                    {line.quantity_ordered - line.quantity_received} {line.item?.unit_of_measure}
                  </Text>
                  <Text style={styles.td}>{line.unit_cost !== null ? `${currency} ${formatMoney(line.unit_cost)}` : "-"}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <DocumentFooter settings={settings} />
      </Page>
    </Document>
  );
}
