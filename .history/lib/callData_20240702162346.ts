export async function callData(url: string) {
    try {
      console.log(`Fetching data from: /api/scrape?url=${encodeURIComponent(url)}`);
      const response = await fetch(`/api/completion}`);
      console.log(`Response status: ${response.status}`);
  
      if (!response.ok) {
        console.error('Failed to fetch scraped data:', response.statusText);
        throw new Error('Failed to fetch scraped data');
      }
  
      const data = await response.json();
      console.log('Fetched data:', data);
      return data;
    } catch (error) {
      console.error('Error in callData:', error);
      throw error;
    }
  }
  