import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type { SymbolItem } from '../../types/symbolItem';

// Register standard fonts
Font.register({
  family: 'Roboto',
  src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
});

const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 30,
    fontFamily: 'Roboto',
  },
  labelBlock: {
    width: '33.33%', // 3 columns
    height: 100, // Fixed height for easy cutting
    border: '1pt dashed #cccccc',
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  reference: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  circuitName: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333333',
    maxHeight: 30,
    overflow: 'hidden',
  },
  details: {
    fontSize: 10,
    color: '#666666',
    marginTop: 'auto',
  },
  emptyNotice: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    width: '100%',
    marginTop: 50,
  }
});

interface PdfLabelDocumentProps {
  symbols: SymbolItem[];
}

export function PdfLabelDocument({ symbols }: PdfLabelDocumentProps) {
  // Only get symbols that physically sit on the DIN rail
  const dinRailSymbols = symbols.filter(s => s.isSnappedToRail)
    .sort((a, b) => a.x - b.x); // Left to right

  return (
    <Document title="Etykiety Modułów - DINBoard">
      <Page size="A4" style={styles.page}>
        {dinRailSymbols.length === 0 ? (
          <Text style={styles.emptyNotice}>Brak modułów na szynie DIN do wygenerowania etykiet.</Text>
        ) : (
          dinRailSymbols.map((symbol) => (
            <View key={symbol.id} style={styles.labelBlock} wrap={false}>
              <Text style={styles.reference}>{symbol.referenceDesignation || symbol.label}</Text>
              <Text style={styles.circuitName}>{symbol.circuitName || symbol.type}</Text>
              <Text style={styles.details}>
                {symbol.protectionType ? `Zab: ${symbol.protectionType}` : ''}
                {symbol.powerW ? ` | ${symbol.powerW}W` : ''}
              </Text>
            </View>
          ))
        )}
      </Page>
    </Document>
  );
}
