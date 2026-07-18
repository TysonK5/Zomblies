import { useEffect, useState } from 'react'
import {
  getKeybindings,
  getRebindingAction,
  subscribeKeybindings,
  type Keybindings,
  type InputAction,
} from './keybindings'

export function useKeybindings() {
  const [bindings, setBindings] = useState<Keybindings>(() => getKeybindings())
  const [listening, setListening] = useState<InputAction | null>(() => getRebindingAction())

  useEffect(() => {
    return subscribeKeybindings((b) => {
      setBindings({ ...b })
      setListening(getRebindingAction())
    })
  }, [])

  return { bindings, listening }
}
