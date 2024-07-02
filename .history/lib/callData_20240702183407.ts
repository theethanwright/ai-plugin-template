// Define the types for the data you expect to receive from the API
export interface WebsiteData {
    text: string;
    css: string[];
    colors: string[];
    screenshot: string; // Buffer will be converted to a base64 string for JSON
  }
  
  export async function callData(url: string): Promise<WebsiteData> {
    try {
      const response = await fetch(`/api/?url=${encodeURIComponent(url)}`, {
        method: "POST", // Explicitly specifying the GET method
      });
      console.log(`Response status: ${response.status}`);
  
      if (!response.ok) {
        console.error('Failed to fetch scraped data:', response.statusText);
        throw new Error('Failed to fetch scraped data');
      }
  
      const data: WebsiteData = await response.json();
      console.log('Fetched data:', data);
      return data;
    } catch (error) {
      console.error('Error in callData:', error);
      throw error;
    }
  }
  