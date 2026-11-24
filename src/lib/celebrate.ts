import confetti from 'canvas-confetti'

export function celebrate(big = false) {
  const colors = ['#FF9933', '#22C55E', '#EAB308', '#3B82F6', '#EC4899']
  if (!big) {
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 }, colors, scalar: 0.8 })
    return
  }
  const end = Date.now() + 1200
  ;(function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors })
    confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors })
    if (Date.now() < end) requestAnimationFrame(frame)
  })()
}
