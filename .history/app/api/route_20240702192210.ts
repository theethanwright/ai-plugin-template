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
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  const html = await page.content();
  const $ = cheerio.load(html);
  const text = $('body').text().trim();  // Trim to remove unnecessary whitespaces

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
    const cssContent = await page.goto(sheetUrl).then(res => res?.text());
    if (cssContent) {
      const cssObj = parseCSS(cssContent);
      extractColorsFromCSS(cssObj, colors);
    }
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