import { useCommunicationTemplateList } from 'components/communication-template/hooks'
import { useReducer } from 'react'

enum ComposerActionType {
  Reset = 'RESET',
  SetContent = 'SET_CONTENT',
  ToggleSending = 'TOGGLE_SENDING',
  ToggleConfirmation = 'TOGGLE_CONFIRMATION',
}

type ComposerAction =
  | {
      type: ComposerActionType.ToggleSending
      payload: { isSending: boolean }
    }
  | {
      type: ComposerActionType.SetContent
      payload: { content: string }
    }
  | {
      type: ComposerActionType.ToggleConfirmation
    }
  | {
      type: ComposerActionType.Reset
    }

type ComposerState = {
  isSending: boolean
  isConfirmed: boolean
  requiresConfirmation: boolean
  content: string
}

const initialState = {
  requiresConfirmation: false,
  isConfirmed: false,
  isSending: false,
  content: '',
}

const confirmationReducer = (state: ComposerState, action: ComposerAction) => {
  switch (action.type) {
    case ComposerActionType.SetContent:
      const PlaceholderCheckRegex = /###.*###/gm
      const requiresConfirmation = PlaceholderCheckRegex.test(
        action.payload.content,
      )
      const newState = {
        ...state,
        requiresConfirmation,
        content: action.payload.content,
      }

      // Only change isConfirmed if changing the content caused requiresConfirmation to be changed
      if (state.requiresConfirmation !== newState.requiresConfirmation) {
        newState.isConfirmed = false
      }

      return newState
    case ComposerActionType.ToggleSending:
      return {
        ...state,
        isSending: action.payload.isSending,
      }
    case ComposerActionType.ToggleConfirmation:
      return {
        ...state,
        isConfirmed: !state.isConfirmed,
      }
    case ComposerActionType.Reset:
      return initialState
    default:
      return state
  }
}

export const useEmailComposer = () => {
  const [state, dispatch] = useReducer(confirmationReducer, initialState)
  const { data: communicationTemplates } = useCommunicationTemplateList({})

  return {
    ...state,
    setContent: (content?: string) =>
      dispatch({
        type: ComposerActionType.SetContent,
        payload: { content: content || '' },
      }),
    toggleSending: (isSending: boolean) =>
      dispatch({
        type: ComposerActionType.ToggleSending,
        payload: { isSending },
      }),
    reset: () => dispatch({ type: ComposerActionType.Reset }),
    toggleConfirmation: () =>
      dispatch({ type: ComposerActionType.ToggleConfirmation }),
    communicationTemplates,
  }
}
