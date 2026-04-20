/**
 * Search utilities for restaurants
 */

/**
 * Filter restaurants by search term
 * @param {Array} restaurants - Array of restaurant objects
 * @param {string} searchTerm - Search term to filter by
 * @returns {Array} Filtered restaurants
 */
export function filterRestaurants(restaurants, searchTerm) {
  if (!searchTerm.trim()) {
    return restaurants;
  }

  const term = searchTerm.toLowerCase();
  return restaurants.filter(
    restaurant =>
      restaurant.name?.toLowerCase().includes(term) ||
      restaurant.address?.toLowerCase().includes(term)
  );
}

/**
 * Sort restaurants by name
 * @param {Array} restaurants - Array of restaurant objects
 * @returns {Array} Sorted restaurants
 */
export function sortRestaurants(restaurants) {
  return [...restaurants].sort((a, b) => a.name.localeCompare(b.name));
}
