export function toTitleCase(str: string): string {
  if (!str) return str
  return str.replace(/\b\w+\b/g, (word) => {
    if (word === word.toUpperCase()) {
      if (word.includes('.')) {
        return word.split('.').map(part => {
          if (part.length === 0) return part
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        }).join('.')
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    }
    return word
  })
}
