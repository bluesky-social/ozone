import { AccountBehaviorTemplate } from './templates/account-behavior'

export enum Templates {
  None = 'None',
  AccountBehavior = 'AccountBehavior',
}

export const TemplateNames = {
  [Templates.None]: 'No template/Raw message',
  [Templates.AccountBehavior]: 'Bluesky Account Behavior',
}

export const TemplateValues = {
  [Templates.None]: '',
  [Templates.AccountBehavior]: AccountBehaviorTemplate,
}

export const getTemplateString = (templateName?: string): string => {
  let template = TemplateValues[Templates.None]

  if (templateName) {
    return TemplateValues[templateName] || template
  }

  return template
}

export const compileTemplate = (
  templateName?: string,
  // A bit too flexible here. Ideally, we should maintain a mapping of required replacements per template to make it more typesafe
  replacements?: Record<string, any>,
): string => {
  let templateString = getTemplateString(templateName)
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
