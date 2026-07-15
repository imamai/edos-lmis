import { Document, Page, View, Text } from "@react-pdf/renderer";
import { DocumentHeader, DocumentFooter, TotalsBlock, InfoBox, formatMoney, styles } from "@/lib/pdf/layout";
import type { TenantSettings } from "@/lib/data/settings";

export type InvoicePdfData = {
  invoice_number: string;
  status: string;
  payer_type: string;
  subtotal: number;
  tax_amount: number;
  is_vat_exempt: boolean;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  issued_at: string | null;
  patient: { first_name: string; last_name: string; patient_number: string } | null;
  items: { description: string; quantity: number; unit_price: number; total_amount: number }[];
  payments: { amount: number; payment_method: string; reference_number: string | null; paid_at: string }[];
};

export function InvoiceDocument({ invoice, settings }: { invoice: InvoicePdfData; settings: TenantSettings }) {
  const currency = settings.currency_code;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DocumentHeader
          settings={settings}
          title="Tax Invoice"
          meta={`Invoice #: ${invoice.invoice_number}`}
          extraMeta={invoice.issued_at ? `Date: ${new Date(invoice.issued_at).toLocaleDateString()}` : undefined}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <Text>
            {invoice.patient ? `${invoice.patient.first_name} ${invoice.patient.last_name} (${invoice.patient.patient_number})` : "Walk-in / Institutional"}
          </Text>
          <Text style={styles.muted}>Payer: {invoice.payer_type.replace(/_/g, " ")}  ·  Status: {invoice.status.replace(/_/g, " ")}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, { flex: 0.3 }]}>#</Text>
              <Text style={[styles.th, { flex: 3 }]}>Description</Text>
              <Text style={styles.th}>Qty</Text>
              <Text style={styles.th}>Unit Price</Text>
              <Text style={styles.th}>Amount</Text>
            </View>
            {invoice.items.map((item, i) => (
              <View style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt} key={i}>
                <Text style={[styles.td, { flex: 0.3 }]}>{i + 1}</Text>
                <Text style={[styles.td, { flex: 3 }]}>{item.description}</Text>
                <Text style={styles.td}>{item.quantity}</Text>
                <Text style={styles.td}>{currency} {formatMoney(item.unit_price)}</Text>
                <Text style={styles.td}>{currency} {formatMoney(item.total_amount)}</Text>
              </View>
            ))}
          </View>
        </View>

        <TotalsBlock
          subtotal={settings.vat_enabled ? invoice.subtotal : undefined}
          vat={settings.vat_enabled ? invoice.tax_amount : undefined}
          vatRate={settings.vat_rate}
          isVatExempt={invoice.is_vat_exempt}
          total={invoice.total_amount}
          currency={currency}
          extraRows={[
            { label: "Paid", value: `${currency} ${formatMoney(invoice.amount_paid)}` },
            { label: "Balance due", value: `${currency} ${formatMoney(invoice.balance_due)}`, emphasis: true },
          ]}
        />

        <InfoBox tone="blue" title="Payment Details">
          {invoice.payments.length === 0 ? (
            <Text style={styles.infoBoxText}>No payments recorded yet.</Text>
          ) : (
            invoice.payments.map((p, i) => (
              <Text style={styles.infoBoxText} key={i}>
                {p.payment_method.replace(/_/g, " ").toUpperCase()}  {currency} {formatMoney(p.amount)}
                {p.reference_number ? `  (Ref: ${p.reference_number})` : ""}
                {"  ·  "}{new Date(p.paid_at).toLocaleDateString()}
              </Text>
            ))
          )}
          {settings.bank_name && (
            <Text style={[styles.infoBoxText, { marginTop: 4 }]}>
              Bank: {settings.bank_name}
              {settings.bank_account_number ? ` - Account: ${settings.bank_account_number}` : ""}
            </Text>
          )}
          {settings.mpesa_till && (
            <Text style={styles.infoBoxText}>M-Pesa Till: {settings.mpesa_till}</Text>
          )}
        </InfoBox>

        <DocumentFooter settings={settings} noteText={settings.invoice_footer_note ?? undefined} />
      </Page>
    </Document>
  );
}
