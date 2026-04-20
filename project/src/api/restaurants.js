/**
 * Restaurant API service
 * Handles all API calls to the restaurant service
 */

const API_BASE_URLS = [
  window.RESTAURANT_API_BASE_URL,
  '/api/v1',
  'https://media2.edu.metropolia.fi/restaurant/api/v1',
].filter(Boolean);

async function fetchJson(path) {
  let lastError = null;

  for (const baseUrl of API_BASE_URLS) {
    try {
      const response = await fetch(`${baseUrl}${path}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      lastError = new Error(`Failed on ${baseUrl}${path}: ${error.message}`);
    }
  }

  throw lastError || new Error('API request failed');
}

/**
 * Get all restaurants
 * @returns {Promise<Array>} List of restaurants
 */
export async function getRestaurants() {
  try {
    return await fetchJson('/restaurants');
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    throw error;
  }
}

/**
 * Get single restaurant details
 * @param {string} id - Restaurant ID
 * @returns {Promise<Object>} Restaurant details
 */
export async function getRestaurant(id) {
  try {
    return await fetchJson(`/restaurants/${id}`);
  } catch (error) {
    console.error(`Error fetching restaurant ${id}:`, error);
    throw error;
  }
}

/**
 * Get daily menu for a restaurant
 * @param {string} id - Restaurant ID
 * @param {string} lang - Language code (e.g., 'fi', 'en')
 * @returns {Promise<Object>} Daily menu
 */
export async function getDailyMenu(id, lang = 'fi') {
  try {
    return await fetchJson(`/restaurants/daily/${id}/${lang}`);
  } catch (error) {
    console.error(`Error fetching daily menu for restaurant ${id}:`, error);
    throw error;
  }
}

/**
 * Get weekly menu for a restaurant
 * @param {string} id - Restaurant ID
 * @param {string} lang - Language code (e.g., 'fi', 'en')
 * @returns {Promise<Object>} Weekly menu
 */
export async function getWeeklyMenu(id, lang = 'fi') {
  try {
    return await fetchJson(`/restaurants/weekly/${id}/${lang}`);
  } catch (error) {
    console.error(`Error fetching weekly menu for restaurant ${id}:`, error);
    throw error;
  }
}
