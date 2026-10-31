import { useEffect, useReducer } from 'react'

/** Re-render whenever an engine object (GameState / RoomHost) notifies. */
export function useObservable(obj) {
  const [tick, bump] = useReducer((x) => x + 1, 0)
  useEffect(() => obj.subscribe(() => bump()), [obj])
  return tick
}
