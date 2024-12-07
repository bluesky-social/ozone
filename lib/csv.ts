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

export const processFileForWorkspaceImport = (file: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const fileType = file.type
    const fileName = file.name.toLowerCase()

    if (fileType === 'application/json' || fileName.endsWith('.json')) {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const jsonData = JSON.parse(reader.result as string)
          const values = extractFromJSON(jsonData)
          if (values.length === 0) {
            reject(new Error(`No 'did' or 'uri' found in ${file.name}`))
          }
          resolve(values)
        } catch (error) {
          reject(new Error(`Invalid JSON file: ${file.name}`))
        }
      }
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
      reader.readAsText(file)
    } else if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const csvData = reader.result as string
          const values = extractFromCSV(csvData)
          if (values.length === 0) {
            reject(new Error(`No 'did' or 'uri' found in ${file.name}`))
          }
          resolve(values)
        } catch (error) {
          reject(new Error(`Invalid CSV file: ${file.name}`))
        }
      }
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
      reader.readAsText(file)
    } else {
      reject(new Error(`Unsupported file type: ${file.name}`))
    }
  })
}

export const extractFromCSV = (data: string): string[] => {
  const rows = data.split('\n').map((row) => row.trim())
  const [header, ...content] = rows

  if (!header) return []

  const headers = header.split(',').map((col) => col.trim())
  const didIndex = headers.indexOf('did')
  const uriIndex = headers.indexOf('uri')

  if (didIndex === -1 && uriIndex === -1) return []

  return content
    .map((row) => {
      const columns = row.split(',').map((col) => col.trim())
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
