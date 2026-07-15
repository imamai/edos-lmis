import { StyleSheet, View, Text, Image } from "@react-pdf/renderer";
import type { TenantSettings } from "@/lib/data/settings";
import { formatMoney } from "@/lib/money";

export { formatMoney };

// Color system matching the tenant's printed tax invoice / quotation format:
// navy table headers, blue titles/totals, blue "payment details" box, amber
// "notes" box.
const blue900 = "#1e3a8a";
const blue700 = "#1d4ed8";
const blue50 = "#eff6ff";
const blue200 = "#bfdbfe";
const amber50 = "#fffbeb";
const amber200 = "#fde68a";
const amber800 = "#92400e";
const zebra = "#f8fafc";
const border = "#e5e7eb";
const muted = "#6b7280";
const text = "#111827";

export const styles = StyleSheet.create({
  page: { padding: 32, paddingBottom: 60, fontSize: 10, fontFamily: "Helvetica", color: text },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: blue900,
  },
  headerLeft: { flexDirection: "row" },
  logo: { width: 56, height: 56, marginRight: 10, objectFit: "contain" },
  clinicName: { fontSize: 16, fontWeight: 700, color: blue700 },
  muted: { color: muted, fontSize: 9 },
  title: { fontSize: 18, fontWeight: 700, textAlign: "right", color: blue700 },
  titleMeta: { textAlign: "right", fontSize: 9, color: muted, marginTop: 2 },
  section: { marginTop: 12 },
  sectionTitle: { fontSize: 9, fontWeight: 700, marginBottom: 4, color: muted, textTransform: "uppercase" },
  table: { width: "100%", marginTop: 8 },
  tableHeaderRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: blue900,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: border,
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: zebra,
    borderBottomWidth: 1,
    borderBottomColor: border,
  },
  th: { flex: 1, fontWeight: 700, fontSize: 9, color: "#ffffff" },
  td: { flex: 1, fontSize: 9 },
  totalsBlock: { marginTop: 12, alignSelf: "flex-end", width: 220 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalsLabel: { color: muted, fontSize: 9 },
  totalsValue: { fontSize: 9 },
  totalsTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 3,
    borderTopWidth: 1.5,
    borderTopColor: blue900,
  },
  totalsTotalLabel: { fontSize: 11, fontWeight: 700, color: blue700 },
  totalsTotalValue: { fontSize: 11, fontWeight: 700, color: blue700 },
  infoBoxBlue: {
    marginTop: 14,
    padding: 10,
    backgroundColor: blue50,
    borderWidth: 1,
    borderColor: blue200,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: blue700,
  },
  infoBoxAmber: {
    marginTop: 14,
    padding: 10,
    backgroundColor: amber50,
    borderWidth: 1,
    borderColor: amber200,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: amber800,
  },
  infoBoxTitleBlue: { fontSize: 9, fontWeight: 700, color: blue900, marginBottom: 4, textTransform: "uppercase" },
  infoBoxTitleAmber: { fontSize: 9, fontWeight: 700, color: amber800, marginBottom: 4, textTransform: "uppercase" },
  infoBoxText: { fontSize: 9, color: text, marginBottom: 2 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
  },
  footerNote: {
    fontSize: 8,
    color: muted,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: border,
    marginBottom: 6,
  },
  footerBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  signatureImg: { width: 90, height: 36, objectFit: "contain" },
});

export function DocumentHeader({
  settings,
  title,
  meta,
  extraMeta,
}: {
  settings: TenantSettings;
  title: string;
  meta?: string;
  extraMeta?: string;
}) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.headerLeft}>
        {settings.logo_url && <Image src={settings.logo_url} style={styles.logo} />}
        <View>
          <Text style={[styles.clinicName, { color: settings.theme_color }]}>{settings.clinic_name ?? "EDOS LMIS"}</Text>
          {settings.clinic_address && <Text style={styles.muted}>{settings.clinic_address}</Text>}
          {settings.clinic_phone && <Text style={styles.muted}>Tel: {settings.clinic_phone}</Text>}
          {settings.clinic_email && <Text style={styles.muted}>{settings.clinic_email}</Text>}
          {settings.kra_pin && <Text style={styles.muted}>KRA PIN: {settings.kra_pin}</Text>}
        </View>
      </View>
      <View>
        <Text style={[styles.title, { color: settings.theme_color }]}>{title}</Text>
        {meta && <Text style={styles.titleMeta}>{meta}</Text>}
        {extraMeta && <Text style={styles.titleMeta}>{extraMeta}</Text>}
      </View>
    </View>
  );
}

export function TotalsBlock({
  subtotal,
  vat,
  vatRate,
  isVatExempt,
  total,
  currency,
  extraRows,
}: {
  /** Omit subtotal/vat/vatRate for a totals-only block (just the TOTAL row) — e.g. purchase orders, which don't track VAT. */
  subtotal?: number;
  vat?: number;
  vatRate?: number;
  isVatExempt?: boolean;
  total: number;
  currency: string;
  extraRows?: { label: string; value: string; emphasis?: boolean }[];
}) {
  const showBreakdown = subtotal !== undefined && vat !== undefined;
  return (
    <View style={styles.totalsBlock}>
      {showBreakdown && (
        <>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{currency} {formatMoney(subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>{isVatExempt ? "VAT (Exempt)" : `VAT (${vatRate}%)`}</Text>
            <Text style={styles.totalsValue}>{currency} {formatMoney(vat)}</Text>
          </View>
        </>
      )}
      <View style={styles.totalsTotalRow}>
        <Text style={styles.totalsTotalLabel}>TOTAL</Text>
        <Text style={styles.totalsTotalValue}>{currency} {formatMoney(total)}</Text>
      </View>
      {extraRows?.map((row, i) => (
        <View style={styles.totalsRow} key={i}>
          <Text style={styles.totalsLabel}>{row.label}</Text>
          <Text style={[styles.totalsValue, row.emphasis ? { fontWeight: 700 } : {}]}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function InfoBox({
  tone,
  title,
  children,
}: {
  tone: "blue" | "amber";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={tone === "blue" ? styles.infoBoxBlue : styles.infoBoxAmber}>
      <Text style={tone === "blue" ? styles.infoBoxTitleBlue : styles.infoBoxTitleAmber}>{title}</Text>
      {children}
    </View>
  );
}

export function DocumentFooter({ settings, noteText }: { settings: TenantSettings; noteText?: string }) {
  return (
    <View style={styles.footer} fixed>
      {noteText && <Text style={styles.footerNote}>{noteText}</Text>}
      <View style={styles.footerBottomRow}>
        <Text
          style={styles.muted}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
        {settings.signature_url ? (
          <View style={{ alignItems: "center" }}>
            <Image src={settings.signature_url} style={styles.signatureImg} />
            <Text style={styles.muted}>Authorized signature</Text>
          </View>
        ) : (
          <Text style={styles.muted}>Generated by EDOS LMIS</Text>
        )}
      </View>
    </View>
  );
}
