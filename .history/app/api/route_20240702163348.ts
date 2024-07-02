import { NextApiRequest, NextApiResponse } from 'next';
import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import { parse as parseCSS } from 'css';

interface WebsiteData {
  text: string;
  css: string[];
  colors: string[];
  screenshot: Buffer;
}

async function getWebsiteData(url: string): Promise<WebsiteData> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  const html = await page.content();
  const $ = cheerio.load(html);
  const text = $('body').text();

  const stylesheets: string[] = [];
  $('link[rel="stylesheet"]').each((i, element) => {
    const href = $(element).attr('href');
    if (href) {
      stylesheets.push(href);
    }
  });

  const colors = new Set<string>();

  $('*').each((i, element) => {
    const style = $(element).attr('style');
    if (style) {
      const cssObj = parseCSS(`* { ${style} }`);
      extractColorsFromCSS(cssObj, colors);
    }
  });

  for (const sheet of stylesheets) {
    const sheetUrl = new URL(sheet, url).toString();
    const cssContent = await page.goto(sheetUrl).then(res => res!.text());
    const cssObj = parseCSS(cssContent);
    extractColorsFromCSS(cssObj, colors);
  }

  const screenshot = await page.screenshot();

  await browser.close();

  return {
    text,
    css: stylesheets,
    colors: Array.from(colors),
    screenshot,
  };
}

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  if (!url || typeof url !== 'string') {
    console.error('Invalid URL:', url);
    res.status(400).json({ error: 'Invalid URL' });
    return;
  }

  try {
    console.log('Fetching website data for URL:', url);
    const data = await getWebsiteData(url as string);
    console.log('Fetched website data:', data);
    res.status(200).json(data);
  } catch (error) {
    console.error('Failed to scrape website data:', error);
    res.status(500).json({ error: 'Failed to scrape website data' });
  }
}
