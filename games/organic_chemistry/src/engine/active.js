// The world of the scene being played, for HTML overlays (the map) that live outside the Canvas.
let current = null
export const setActiveWorld = (w) => { current = w }
export const getActiveWorld = () => current
