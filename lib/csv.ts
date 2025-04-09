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
}): CsvContent {
  return {
    filename: (filename || Date.now().toString()) + '.csv',
    headerRow: headers.join(',') + lineDelimiter, // make your own csv head
    body: lines.join(lineDelimiter),
  }
}

export function downloadCSV(csv: CsvContent) {
  let csvContent = csv.headerRow + csv.body
  if (!csvContent.match(/^data:text\/csv/i)) {
    csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent)
  }

  const link = document.createElement('a')
  link.href = csvContent
  link.download = csv.filename

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const processFileForWorkspaceImport = (
  file: File,
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const fileType = file.type
    const fileName = file.name.toLowerCase()
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const content = reader.result as string
        let values: string[] = []

        if (fileType === 'application/json' || fileName.endsWith('.json')) {
          const jsonData = JSON.parse(content)
          values = extractFromJSON(jsonData)
        } else if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
          values = extractFromCSV(content)
        } else {
          return reject(new Error(`Unsupported file type: ${file.name}`))
        }

        if (values.length === 0) {
          return reject(new Error(`No 'did' or 'uri' found in ${file.name}`))
        }

        resolve(values)
      } catch (error) {
        reject(new Error(`Error parsing file content: ${file.name}`))
      }
    }
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.readAsText(file)
  })
}

const cleanCSVColumn = (col: string) => {
  const trimmed = col.trim()
  return trimmed.startsWith('"') && trimmed.endsWith('"')
    ? trimmed.slice(1, -1)
    : trimmed
}

export const extractFromCSV = (data: string): string[] => {
  const rows = data.split('\n').map((row) => row.trim())
  const [header, ...content] = rows

  if (!header) return []

  // In case header names are quoted, we want to exclude those quotes before check
  const headers = header.split(',').map(cleanCSVColumn)
  const didIndex = headers.indexOf('did')
  const uriIndex = headers.indexOf('uri')

  if (didIndex === -1 && uriIndex === -1) return []

  return content
    .map((row) => {
      const columns = row.split(',').map(cleanCSVColumn)
      return columns[didIndex] || columns[uriIndex]
    })
    .filter(Boolean)
}

export const extractFromJSON = (data: any): string[] => {
  if (Array.isArray(data)) {
    return data
      .filter((item) => item.did || item.uri)
      .map((item) => item.did || item.uri)
  } else if (typeof data === 'object') {
    return data.did || data.uri ? [data.did || data.uri] : []
  }
  return []
}
