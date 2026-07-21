import { Document, Page, View, Text } from "@react-pdf/renderer";
import { DocumentHeader, DocumentFooter, TotalsBlock, formatMoney, styles } from "@/lib/pdf/layout";
import type { TenantSettings } from "@/lib/data/settings";
import type { PurchaseOrderDetail } from "@/lib/data/procurement";

export function PurchaseOrderDocument({ po, settings }: { po: PurchaseOrderDetail; settings: TenantSettings }) {
  const currency = settings.currency_code;
  const total = po.lines.reduce(
    (sum, line) => sum + (line.unit_cost !== null ? line.unit_cost * line.quantity_ordered : 0),
    0
  );
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DocumentHeader
          settings={settings}
          title="Purchase Order"
          meta={`PO #: ${po.po_number}${po.revision > 0 ? `  ·  Rev. ${po.revision}` : ""}`}
          extraMeta={`Date: ${new Date(po.order_date).toLocaleDateString()}`}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Supplier</Text>
          <Text>{po.supplier?.name ?? "-"}</Text>
          {po.supplier?.contact_person && <Text style={styles.muted}>Attn: {po.supplier.contact_person}</Text>}
          <Text style={styles.muted}>
            {[po.supplier?.phone, po.supplier?.email].filter(Boolean).join("  ·  ")}
          </Text>
          {po.supplier?.address && <Text style={styles.muted}>{po.supplier.address}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order details</Text>
          <Text style={styles.muted}>
            Status: {po.status.replace(/_/g, " ")}
            {po.expected_date ? `  ·  Expected: ${new Date(po.expected_date).toLocaleDateString()}` : ""}
          </Text>
          {po.supplier_invoice_number && (
            <Text style={styles.muted}>Supplier Invoice #: {po.supplier_invoice_number}</Text>
          )}
          {po.notes && <Text style={styles.muted}>Notes: {po.notes}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commodities ordered</Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, { flex: 3 }]}>Commodity</Text>
              <Text style={styles.th}>Ordered</Text>
              <Text style={styles.th}>Received</Text>
              <Text style={styles.th}>Unit cost</Text>
              <Text style={styles.th}>Line total</Text>
            </View>
            {po.lines.map((line, i) => (
              <View style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt} key={line.id}>
                <Text style={[styles.td, { flex: 3 }]}>
                  {line.item?.name} ({line.item?.code})
                </Text>
                <Text style={styles.td}>{line.quantity_ordered} {line.item?.unit_of_measure}</Text>
                <Text style={styles.td}>{line.quantity_received} {line.item?.unit_of_measure}</Text>
                <Text style={styles.td}>{line.unit_cost !== null ? `${currency} ${formatMoney(line.unit_cost)}` : "-"}</Text>
                <Text style={styles.td}>
                  {line.unit_cost !== null ? `${currency} ${formatMoney(line.unit_cost * line.quantity_ordered)}` : "-"}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {total > 0 && <TotalsBlock total={total} currency={currency} />}

        <DocumentFooter settings={settings} />
      </Page>
    </Document>
  );
}
