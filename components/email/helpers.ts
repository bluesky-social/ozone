import { EmailTemplates } from './templates'

export const getTemplate = (
  templateName?: string,
): { subject: string; content: string } => {
  // Default to the first template in the array
  let template = Object.values(EmailTemplates)[0]

  if (templateName) {
    return EmailTemplates[templateName] || template
  }

  return template
}

export const compileTemplateContent = (
  templateName?: string,
  // A bit too flexible here. Ideally, we should maintain a mapping of required replacements per template to make it more typesafe
  replacements?: Record<string, any>,
): string => {
  let templateString = getTemplate(templateName).content
  if (!replacements) return templateString

  Object.entries(replacements).forEach(
    ([key, val]) =>
      (templateString = templateString.replace(
        new RegExp(`{{${key}}}`, 'ig'),
        val,
      )),
  )

  return templateString
}
