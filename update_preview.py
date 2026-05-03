import re

with open('src/components/PdfDocumentationPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if 'PDFViewer' not in content:
    content = content.replace('PDFDownloadLink', 'PDFDownloadLink, PDFViewer')

# Find the start of the title-page branch
start_marker = '{selectedPreviewTab === "title-page" ? ('
end_marker = ') : ('

# We need to find the specific block for the title-page tab
pattern = re.compile(r'\{selectedPreviewTab === "title-page" \? \([\s\S]*?\) : \(', re.MULTILINE)

replacement = """{selectedPreviewTab === "title-page" ? (
                  <div style={{ width: '100%', height: '100%', minHeight: '600px', display: 'flex' }}>
                    <PDFViewer width="100%" height="100%" style={{ border: 'none', flex: 1 }} showToolbar={false}>
                      <PdfProtocolDocument
                        metadata={metadata}
                        symbols={[]}
                        phaseDistribution={{ l1PowerW:0, l2PowerW:0, l3PowerW:0, l1CurrentA:0, l2CurrentA:0, l3CurrentA:0, totalPowerW:0, imbalancePercent:0 }}
                        validationResult={{ errors: [], warnings: [] }}
                        schematicImages={[]}
                        dinRailImages={[]}
                        previewOnly="title-page"
                      />
                    </PDFViewer>
                  </div>
                ) : ("""

content = pattern.sub(replacement, content, count=1)

with open('src/components/PdfDocumentationPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Replaced HTML preview with PDFViewer')
