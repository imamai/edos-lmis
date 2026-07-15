import { Document, Page, View, Text } from "@react-pdf/renderer";
import { DocumentHeader, DocumentFooter, TotalsBlock, InfoBox, formatMoney, styles } from "@/lib/pdf/layout";
import type { TenantSettings } from "@/lib/data/settings";

export type QuotationPdfData = {
  quotation_number: string;
  customer_name: string | null;
  quote_date: string;
  valid_until: string | null;
  notes: string | null;
  subtotal: number;
  tax_amount: number;
  is_vat_exempt: boolean;
  total_amount: number;
  revision: number;
  items: { description: string; quantity: number; unit_of_measure: string; unit_price: number; total_amount: number }[];
};

export function QuotationDocument({ quotation, settings }: { quotation: QuotationPdfData; settings: TenantSettings }) {
  const currency = settings.currency_code;
  const validUntilLabel = quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString() : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DocumentHeader
          settings={settings}
          title="Quotation"
          meta={`Quote #: ${quotation.quotation_number}${quotation.revision > 0 ? `  ·  Rev. ${quotation.revision}` : ""}`}
          extraMeta={`Date: ${new Date(quotation.quote_date).toLocaleDateString()}${validUntilLabel ? `  ·  Valid Until: ${validUntilLabel}` : ""}`}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prepared For</Text>
          <Text>{quotation.customer_name?.trim() || "General Quotation"}</Text>
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
            {quotation.items.map((item, i) => (
              <View style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt} key={i}>
                <Text style={[styles.td, { flex: 0.3 }]}>{i + 1}</Text>
                <Text style={[styles.td, { flex: 3 }]}>{item.description}</Text>
                <Text style={styles.td}>{item.quantity} {item.unit_of_measure}</Text>
                <Text style={styles.td}>{currency} {formatMoney(item.unit_price)}</Text>
                <Text style={styles.td}>{currency} {formatMoney(item.total_amount)}</Text>
              </View>
            ))}
          </View>
        </View>

        <TotalsBlock
          subtotal={settings.vat_enabled ? quotation.subtotal : undefined}
          vat={settings.vat_enabled ? quotation.tax_amount : undefined}
          vatRate={settings.vat_rate}
          isVatExempt={quotation.is_vat_exempt}
          total={quotation.total_amount}
          currency={currency}
        />

        <InfoBox tone="amber" title="Quotation Notes">
          {validUntilLabel && <Text style={styles.infoBoxText}>• This quotation is valid until {validUntilLabel}.</Text>}
          {settings.quotation_footer_note && (
            <Text style={styles.infoBoxText}>• {settings.quotation_footer_note}</Text>
          )}
          {quotation.notes?.trim() && <Text style={styles.infoBoxText}>• {quotation.notes.trim()}</Text>}
        </InfoBox>

        <DocumentFooter settings={settings} />
      </Page>
    </Document>
  );
}
