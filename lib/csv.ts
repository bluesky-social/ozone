export type CsvContent = {
  filename: string
  headerRow: string
  body: string
}
export const escapeCSVValue = (value: string) => {
  if (
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\r') ||
    value.includes('\n')
  ) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}
export function createCSV({
  headers,
  lines,
  filename,
  lineDelimiter = '\n',
}: {
  lines: string[]
  headers: string[]
  filename?: string
  lineDelimiter?: string
}) {
  return {
    filename: (filename || Date.now().toString()) + '.csv',
    headerRow: headers.join(',') + lineDelimiter, // make your own csv head
    body: lines.join(lineDelimiter),
  }
}

export function downloadCSV(csv: CsvContent) {
  var csvContent = csv.headerRow + csv.body
  if (!csvContent.match(/^data:text\/csv/i)) {
    csvContent = 'data:text/csv;charset=utf-8,' + csvContent // use 'data:text/csv;charset=utf-8,\ufeff', if you consider using the excel
  }
  var data = encodeURI(csvContent)

  var link = document.createElement('a')
  link.href = data
  link.download = csv.filename

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
