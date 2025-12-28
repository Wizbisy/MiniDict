async function fetchTags() {
  try {
    const response = await fetch("https://gamma-api.polymarket.com/tags?limit=200")
    const tags = await response.json()

    console.log("Available Polymarket Tags:")
    console.log("=".repeat(50))

    tags.forEach((tag: any) => {
      console.log(`ID: ${tag.id} | Label: ${tag.label} | Slug: ${tag.slug}`)
    })

    console.log("\n" + "=".repeat(50))
    console.log(`Total tags: ${tags.length}`)
  } catch (error) {
    console.error("Failed to fetch tags:", error)
  }
}

fetchTags()
