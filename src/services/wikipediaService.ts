import { WikipediaArticle, WikipediaResponse } from './types';
import { fetchWikipediaContent } from './wikipediaApi';
import { transformToArticle } from './articleTransformer';

const CRYPTO_CATEGORIES = [
  'Cryptocurrency',
  'Bitcoin',
  'Blockchain',
  'Digital currency',
  'Cryptography',
  'Financial technology'
];

const getRelatedArticles = async (article: WikipediaArticle): Promise<WikipediaArticle[]> => {
  try {
    // First try to get related crypto articles
    const categoryTitles = CRYPTO_CATEGORIES.map(cat => `Category:${cat}`).join('|');
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      list: 'categorymembers',
      cmtitle: categoryTitles,
      cmlimit: '10',
      cmtype: 'page'
    });

    const categoryResponse = await fetch(`https://en.wikipedia.org/w/api.php?${params}`);
    if (!categoryResponse.ok) throw new Error('Failed to fetch category articles');
    
    const categoryData = await categoryResponse.json() as WikipediaResponse;
    const relatedTitles = categoryData.query?.categorymembers
      ?.filter(article => article.title !== article.title)
      ?.map(article => article.title)
      ?.slice(0, 10) || [];

    if (relatedTitles.length === 0) {
      return getRandomArticles(3);
    }

    const data = await fetchWikipediaContent(relatedTitles) as WikipediaResponse;
    const pages = Object.values(data.query?.pages || {});
    
    const articles = await Promise.all(pages.map(transformToArticle));
    return articles.filter(article => article !== null) as WikipediaArticle[];
  } catch (error) {
    console.error('Error fetching related articles:', error);
    return getRandomArticles(3);
  }
};

const getRandomArticles = async (count: number = 3, category?: string): Promise<WikipediaArticle[]> => {
  try {
    let titles: string[];
    const multiplier = 3;
    
    // Always use crypto categories for random articles
    const selectedCategory = category === "All" ? 
      CRYPTO_CATEGORIES[Math.floor(Math.random() * CRYPTO_CATEGORIES.length)] : 
      category || CRYPTO_CATEGORIES[Math.floor(Math.random() * CRYPTO_CATEGORIES.length)];

    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      list: 'categorymembers',
      cmtitle: `Category:${selectedCategory}`,
      cmlimit: (count * multiplier).toString(),
      cmtype: 'page'
    });

    const categoryResponse = await fetch(`https://en.wikipedia.org/w/api.php?${params}`);
    if (!categoryResponse.ok) throw new Error('Failed to fetch category articles');
    
    const categoryData = await categoryResponse.json() as WikipediaResponse;
    titles = categoryData.query?.categorymembers?.map(article => article.title) || [];

    if (!titles.length) throw new Error('No articles found');

    const data = await fetchWikipediaContent(titles) as WikipediaResponse;
    const pages = Object.values(data.query?.pages || {});
    
    const articles = await Promise.all(pages.map(transformToArticle));
    const validArticles = articles.filter(article => article !== null) as WikipediaArticle[];
    
    if (validArticles.length < count) {
      const moreArticles = await getRandomArticles(count - validArticles.length);
      return [...validArticles, ...moreArticles].slice(0, count);
    }
    
    return validArticles.slice(0, count);
  } catch (error) {
    console.error('Error fetching articles:', error);
    throw error;
  }
};

const searchArticles = async (query: string): Promise<WikipediaArticle[]> => {
  if (!query || query.length < 3) return [];

  try {
    // Append crypto-related terms to the search query
    const cryptoQuery = `${query} cryptocurrency OR bitcoin OR blockchain`;
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      list: 'search',
      srsearch: cryptoQuery,
      srlimit: '20'
    });

    const searchResponse = await fetch(`https://en.wikipedia.org/w/api.php?${params}`);
    if (!searchResponse.ok) throw new Error('Search request failed');
    
    const searchData = await searchResponse.json() as WikipediaResponse;
    if (!searchData.query?.search?.length) return [];

    const titles = searchData.query.search.map(result => result.title);
    const data = await fetchWikipediaContent(titles) as WikipediaResponse;
    const pages = Object.values(data.query?.pages || {});
    
    const articles = await Promise.all(pages.map(transformToArticle));
    return articles.filter(article => article !== null) as WikipediaArticle[];
  } catch (error) {
    console.error('Error searching articles:', error);
    throw error;
  }
};

export { 
  getRandomArticles,
  searchArticles,
  getRelatedArticles,
  type WikipediaArticle 
};