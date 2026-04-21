import {getCurrentUser, logout, requireAuth} from './auth.js';

const RESTAURANTS_CACHE_KEY = 'or_restaurants_cache';

function readRestaurantCache() {
  try {
    const restaurants = JSON.parse(
      localStorage.getItem(RESTAURANTS_CACHE_KEY) || '[]'
    );
    return Array.isArray(restaurants) ? restaurants : [];
  } catch {
    return [];
  }
}

function getRestaurantNameById(restaurantId) {
  const restaurants = readRestaurantCache();
  return (
    restaurants.find(restaurant => restaurant._id === restaurantId)?.name ||
    restaurantId
  );
}

const user = requireAuth();

if (user) {
  const usernameEl = document.getElementById('profileUsername');
  const emailEl = document.getElementById('profileEmail');
  const favouritesListEl = document.getElementById(
    'profileFavouriteRestaurants'
  );
  const heroNameEl = document.getElementById('profileHeroName');

  usernameEl.textContent = user.username;
  heroNameEl.textContent = user.username;
  emailEl.textContent = user.email || '-';

  const favourites = Array.isArray(user.favouriteRestaurants)
    ? user.favouriteRestaurants
    : [];

  if (favouritesListEl) {
    favouritesListEl.innerHTML = favourites.length
      ? favourites
          .map(
            restaurantId => `<li>${getRestaurantNameById(restaurantId)}</li>`
          )
          .join('')
      : '<li>Ei vielä suosikkeja</li>';
  }
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    logout();
    window.location.href = 'login.html';
  });
}

const backBtn = document.getElementById('backBtn');
if (backBtn && !getCurrentUser()) {
  backBtn.href = 'login.html';
}
