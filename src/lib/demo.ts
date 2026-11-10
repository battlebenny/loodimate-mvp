/** Hidden demo switch: /?demo=demo-jedha makes this browser act as the demo device. Only demo- ids. */
export function readDemoDevice(search: string): string | null {
  const id = new URLSearchParams(search).get('demo')
  return id && /^demo-[a-z0-9-]{1,40}$/.test(id) ? id : null
}
