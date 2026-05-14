export const initialState = {
  started: false,
  currentStep: 1,
  tourEnabled: false,
}

export const Actions = {
  START_BRIEF: 'START_BRIEF',
  TOGGLE_TOUR: 'TOGGLE_TOUR',
}

export function reducer(state, action) {
  switch (action.type) {
    case Actions.START_BRIEF:
      return { ...state, started: true, currentStep: 1 }
    case Actions.TOGGLE_TOUR:
      return { ...state, tourEnabled: !state.tourEnabled }
    default:
      return state
  }
}
