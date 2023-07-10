import { TakeDownWarningTemplate } from './templates/take-down-warning'

export enum Templates {
  None = 'None',
  TakeDownWarning = 'TakeDownWarning',
}

export const TemplateNames = {
  [Templates.None]: 'No template/Raw message',
  [Templates.TakeDownWarning]: 'Take down warning',
}

export const TemplateValues = {
  [Templates.None]: '{{message}}',
  [Templates.TakeDownWarning]: TakeDownWarningTemplate,
}

export const getTemplateString = (templateName?: string): string => {
  let template = TemplateValues[Templates.None]

  if (templateName) {
    return TemplateValues[templateName] || template
  }

  return template
}
