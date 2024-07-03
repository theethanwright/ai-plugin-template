import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import { parse as parseCSS } from 'css';

interface WebsiteData {
  text: string;
  css: string[];
  colors: string[];
  screenshot: Buffer;
}

// Extract colors from CSS
function extractColorsFromCSS(cssObj: any, colors: Set<string>) {
  for (const rule of cssObj.stylesheet.rules) {
    if (rule.declarations) {
      for (const declaration of rule.declarations) {
        if (declaration.property && declaration.property.includes('color')) {
          colors.add(declaration.value);
        }
      }
    }
  }
}

// Get website data
async function getWebsiteData(url: string): Promise<WebsiteData> {
  console.log(`Launching browser to fetch data from: ${url}`);
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  console.log(`Navigated to ${url}`);
  const html = await page.content();
  const $ = cheerio.load(html);
  const text = $('body').text().trim();  // Trim to remove unnecessary whitespaces
  console.log('Extracted text content from the page');

  const stylesheets: string[] = [];
  $('link[rel="stylesheet"]').each((i, element) => {
    const href = $(element).attr('href');
    if (href) {
      stylesheets.push(href);
    }
  });
  console.log('Extracted stylesheets:', stylesheets);

  const colors = new Set<string>();

  $('*').each((i, element) => {
    const style = $(element).attr('style');
    if (style) {
      const cssObj = parseCSS(`* { ${style} }`);
      extractColorsFromCSS(cssObj, colors);
    }
  });
  console.log('Extracted inline colors:', Array.from(colors));

  for (const sheet of stylesheets) {
    const sheetUrl = new URL(sheet, url).toString();
    try {
      const cssContent = await page.goto(sheetUrl).then(res => res?.text());
      if (cssContent) {
        const cssObj = parseCSS(cssContent);
        extractColorsFromCSS(cssObj, colors);
      }
    } catch (error) {
      console.error(`Failed to fetch or parse stylesheet: ${sheetUrl}`, error);
    }
  }
  console.log('Extracted colors from stylesheets:', Array.from(colors));

  const screenshot = await page.screenshot();
  console.log('Captured screenshot of the page');

  await browser.close();
  console.log('Closed browser');

  return {
    text: text,
    css: stylesheets,
    colors: Array.from(colors),
    screenshot,
  };
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  console.log('Received GET request with URL:', url);

  if (!url) {
    console.error('Invalid URL');
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const data = await getWebsiteData(url);
    console.log('Fetched website data successfully');
    // Convert Buffer to base64 string for JSON serialization
    data.screenshot = data.screenshot.toString('base64');
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch website data:', error);
    return NextResponse.json({ error: 'Failed to fetch website data' }, { status: 500 });
  }
}
