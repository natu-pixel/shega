/** All prepared people face +Z before their scene placement is applied. */
export function facingTarget(position: [number, number, number], target: [number, number]) {
  return Math.atan2(target[0] - position[0], target[1] - position[2]);
}
