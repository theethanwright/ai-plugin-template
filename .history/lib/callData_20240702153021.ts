export async function callData(url: string) {
    const response = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch scraped data');
    }
    const data = await response.json();
    return data;
  }
  
  // Example usage
  fetchScrapedData('https://example.com')
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error));
  