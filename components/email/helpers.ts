import { ToolsOzoneCommunicationDefs } from '@atproto/api'

export const getTemplate = (
  templateName: string,
  templateList: ToolsOzoneCommunicationDefs.TemplateView[],
): ToolsOzoneCommunicationDefs.TemplateView | undefined => {
  return templateList.find((template) => template.name === templateName)
}

export const compileTemplateContent = (
  content: string,
  // A bit too flexible here. Ideally, we should maintain a mapping of required replacements per template to make it more typesafe
  replacements?: Record<string, any>,
): string => {
  if (!replacements) return content

  Object.entries(replacements).forEach(
    ([key, val]) =>
      (content = content.replace(new RegExp(`{{${key}}}`, 'ig'), val)),
  )

  return content
}
