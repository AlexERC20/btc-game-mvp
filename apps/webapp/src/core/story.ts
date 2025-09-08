export type StoryBlock = {
  title?: string
  subtitle?: string
  body?: string[]
}

// Very basic placeholder implementation that wraps the full text into a single block.
export function makeStory(text: string, _max: number): StoryBlock[] {
  const body = text.split(/\n+/).filter(Boolean)
  return [{ body }]
}
