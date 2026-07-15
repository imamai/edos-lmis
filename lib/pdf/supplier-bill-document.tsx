import { Document, Page, View, Text } from "@react-pdf/renderer";
import { DocumentHeader, DocumentFooter, TotalsBlock, InfoBox, formatMoney, styles } from "@/lib/pdf/layout";
import type { TenantSettings } from "@/lib/data/settings";
import type { SupplierBillDetail } from "@/lib/data/supplier-bills";

export function SupplierBillDocument({ bill, settings }: { bill: SupplierBillDetail; settings: TenantSettings }) {
  const currency = settings.currency_code;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DocumentHeader
          settings={settings}
          title="Supplier Bill"
          meta={`Bill #: ${bill.bill_number}`}
          extraMeta={`Date: ${new Date(bill.bill_date).toLocaleDateString()}`}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Owed To</Text>
          <Text>{bill.supplier?.name ?? "-"}</Text>
          <Text style={styles.muted}>
            {[bill.supplier?.phone, bill.supplier?.email].filter(Boolean).join("  ·  ")}
          </Text>
          <Text style={styles.muted}>Status: {bill.status.replace(/_/g, " ")}</Text>
          {bill.supplier_invoice_number && (
            <Text style={styles.muted}>Supplier Invoice #: {bill.supplier_invoice_number}</Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, { flex: 3 }]}>Description</Text>
              <Text style={styles.th}>Qty</Text>
              <Text style={styles.th}>Unit Cost</Text>
              <Text style={styles.th}>Amount</Text>
            </View>
            {bill.items.map((item, i) => (
              <View style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt} key={item.id}>
                <Text style={[styles.td, { flex: 3 }]}>{item.description}</Text>
                <Text style={styles.td}>{item.quantity}</Text>
                <Text style={styles.td}>{currency} {formatMoney(item.unit_cost)}</Text>
                <Text style={styles.td}>{currency} {formatMoney(item.total_amount)}</Text>
              </View>
            ))}
          </View>
        </View>

        <TotalsBlock
          total={bill.total_amount}
          currency={currency}
          extraRows={[
            { label: "Paid", value: `${currency} ${formatMoney(bill.amount_paid)}` },
            { label: "Balance due", value: `${currency} ${formatMoney(bill.balance_due)}`, emphasis: true },
          ]}
        />

        <InfoBox tone="blue" title="Payment History">
          {bill.payments.length === 0 ? (
            <Text style={styles.infoBoxText}>No payments recorded yet.</Text>
          ) : (
            bill.payments.map((p, i) => (
              <Text style={styles.infoBoxText} key={i}>
                {p.payment_method.replace(/_/g, " ").toUpperCase()}  {currency} {formatMoney(p.amount)}
                {p.reference_number ? `  (Ref: ${p.reference_number})` : ""}
                {"  ·  "}{new Date(p.paid_at).toLocaleDateString()}
              </Text>
            ))
          )}
        </InfoBox>

        <DocumentFooter settings={settings} />
      </Page>
    </Document>
  );
}
