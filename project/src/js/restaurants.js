/**
 * Main restaurants page logic
 */

import {
  getRestaurants,
  getDailyMenu,
  getWeeklyMenu,
} from '../api/restaurants.js';
import {
  getCurrentUser,
  logout,
  requireAuth,
  toggleFavouriteRestaurant,
} from './auth.js';
import {filterRestaurants, sortRestaurants} from '../utils/search.js';

let allRestaurants = [];
let selectedRestaurantId = null;
let isDaily = true; // true = daily, false = weekly
let currentSearchTerm = '';
let showOnlyFavorites = false;
let selectedCity = 'all';
let selectedProvider = 'all';
let userLocation = null;
let nearestRestaurantId = null;
let isMapReady = false;

const mapController = {
  mount: () => {},
  update: () => {},
};

const MOCK_RESTAURANTS = [
  {
    _id: 'mock-1',
    name: 'Metropolia Myyrmäki',
    address: 'Jukka Mallin katu 18',
    city: 'Vantaa',
    company: 'Sodexo',
    latitude: 60.2575,
    longitude: 24.8444,
  },
  {
    _id: 'mock-2',
    name: 'Metropolia Myllypuro',
    address: 'Myllypurontie 1',
    city: 'Helsinki',
    company: 'Compass Group',
    latitude: 60.223,
    longitude: 25.0784,
  },
  {
    _id: 'mock-3',
    name: 'Unicafe Kaivopiha',
    address: 'Yliopistonkatu 3',
    city: 'Helsinki',
    company: 'Unicafe',
    latitude: 60.1697,
    longitude: 24.9477,
  },
];

function mockDailyMenu(restaurantId) {
  const menus = {
    'mock-1': {
      courses: [
        {name: 'Kanapasta', price: '8.20 €', diets: 'L'},
        {name: 'Kasviskeitto', price: '6.50 €', diets: 'VEG'},
      ],
    },
    'mock-2': {
      courses: [
        {name: 'Lohikiusaus', price: '8.90 €', diets: 'L'},
        {name: 'Kasvislasagne', price: '7.10 €', diets: 'VEG'},
      ],
    },
    'mock-3': {
      courses: [
        {name: 'Broilerikastike', price: '8.40 €', diets: 'G'},
        {name: 'Falafelit', price: '7.00 €', diets: 'VEG'},
      ],
    },
  };

  return menus[restaurantId] || menus['mock-1'];
}

function mockWeeklyMenu(restaurantId) {
  const days = [
    {
      date: 'Maanantai',
      courses: mockDailyMenu(restaurantId).courses,
    },
    {
      date: 'Tiistai',
      courses: [
        {name: 'Jauhelihakastike', price: '8.20 €', diets: 'L'},
        {name: 'Kasviscurry', price: '7.00 €', diets: 'VEG'},
      ],
    },
    {
      date: 'Keskiviikko',
      courses: [
        {name: 'Tortillat', price: '8.10 €', diets: 'L'},
        {name: 'Linssikeitto', price: '6.90 €', diets: 'VEG'},
      ],
    },
  ];

  return {days};
}

function normalizeRestaurants(response) {
  if (Array.isArray(response)) {
    return response;
  }

  return response?.restaurants || response?.data || [];
}

function normalizeMenu(response) {
  return response?.menu || response?.data || response;
}

function getRestaurantId(restaurant) {
  return restaurant._id || restaurant.id || restaurant.restaurantId || '';
}

function getRestaurantName(restaurant) {
  return restaurant.name || 'Nimetön ravintola';
}

function getRestaurantCity(restaurant) {
  return (
    restaurant.city ||
    restaurant.municipality ||
    restaurant.location?.city ||
    ''
  );
}

function getRestaurantProvider(restaurant) {
  return (
    restaurant.company ||
    restaurant.provider ||
    restaurant.organization ||
    restaurant.type ||
    ''
  );
}

function toNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeLatLng(rawLat, rawLng) {
  const lat = toNumber(rawLat);
  const lng = toNumber(rawLng);

  if (lat === null || lng === null) {
    return null;
  }

  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }

  return [lat, lng];
}

function coordinatesFromArray(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const first = toNumber(coordinates[0]);
  const second = toNumber(coordinates[1]);
  if (first === null || second === null) {
    return null;
  }

  const asLngLat = normalizeLatLng(second, first);
  if (asLngLat) {
    return asLngLat;
  }

  return normalizeLatLng(first, second);
}

function getRestaurantCoordinates(restaurant) {
  const direct = normalizeLatLng(restaurant?.latitude, restaurant?.longitude);
  if (direct) {
    return direct;
  }

  const wgs84 = normalizeLatLng(restaurant?.wgs84_lat, restaurant?.wgs84_lng);
  if (wgs84) {
    return wgs84;
  }

  const locationObject = restaurant?.location || {};

  const nested = normalizeLatLng(locationObject.lat, locationObject.lng);
  if (nested) {
    return nested;
  }

  const nestedAlt = normalizeLatLng(
    locationObject.latitude,
    locationObject.longitude
  );
  if (nestedAlt) {
    return nestedAlt;
  }

  return coordinatesFromArray(locationObject.coordinates);
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function calculateDistanceMeters(start, end) {
  const earthRadiusMeters = 6371000;
  const deltaLat = toRadians(end[0] - start[0]);
  const deltaLng = toRadians(end[1] - start[1]);
  const lat1 = toRadians(start[0]);
  const lat2 = toRadians(end[0]);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2) *
      Math.cos(lat1) *
      Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

function updateNearestRestaurant(restaurants) {
  if (!userLocation || !restaurants.length) {
    nearestRestaurantId = null;
    return;
  }

  let nearestId = null;
  let shortestDistance = Number.POSITIVE_INFINITY;

  restaurants.forEach(restaurant => {
    const coords = getRestaurantCoordinates(restaurant);
    if (!coords) {
      return;
    }

    const distance = calculateDistanceMeters(userLocation, coords);
    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestId = getRestaurantId(restaurant);
    }
  });

  nearestRestaurantId = nearestId;
}

function requestUserLocation() {
  if (!navigator.geolocation) {
    return;
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      userLocation = [position.coords.latitude, position.coords.longitude];
      refreshRestaurantList();
    },
    error => {
      console.warn('Geolocation unavailable:', error?.message || error);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 600000,
    }
  );
}

function optionValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getUniqueSortedValues(restaurants, getter) {
  return Array.from(
    new Set(
      restaurants
        .map(getter)
        .map(value => String(value || '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, 'fi'));
}

function fillSelectOptions(selectElement, values, defaultLabel) {
  if (!selectElement) {
    return;
  }

  const previousValue = selectElement.value || 'all';
  selectElement.innerHTML = `<option value="all">${defaultLabel}</option>${values
    .map(
      value =>
        `<option value="${escapeHtml(optionValue(value))}">${escapeHtml(value)}</option>`
    )
    .join('')}`;

  const hasPreviousValue = Array.from(selectElement.options).some(
    option => option.value === previousValue
  );
  selectElement.value = hasPreviousValue ? previousValue : 'all';
}

function initializeFilterOptions(restaurants) {
  fillSelectOptions(
    cityFilter,
    getUniqueSortedValues(restaurants, getRestaurantCity),
    'Kaikki kaupungit'
  );
  fillSelectOptions(
    providerFilter,
    getUniqueSortedValues(restaurants, getRestaurantProvider),
    'Kaikki palveluntarjoajat'
  );
}

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const dailyBtn = document.getElementById('dailyBtn');
const weeklyBtn = document.getElementById('weeklyBtn');
const restaurantsList = document.getElementById('restaurantsList');
const menuContent = document.getElementById('menuContent');
const heroProfileName = document.getElementById('heroProfileName');
const heroAvatar = document.getElementById('heroAvatar');
const logoutBtn = document.getElementById('logoutBtn');
const viewFilterButtons = document.querySelectorAll('.view-filter-btn');
const cityFilter = document.getElementById('cityFilter');
const providerFilter = document.getElementById('providerFilter');
const restaurantsMapRoot = document.getElementById('restaurantsMapRoot');
const RESTAURANTS_CACHE_KEY = 'or_restaurants_cache';

async function initializeMap() {
  if (!restaurantsMapRoot) {
    return;
  }

  try {
    const mapModule = await import('./restaurants-map-react.js');
    mapController.mount = mapModule.mountRestaurantsMap;
    mapController.update = mapModule.updateRestaurantsMap;
    mapController.mount(restaurantsMapRoot);
    isMapReady = true;
  } catch (error) {
    console.warn('Map module unavailable, continuing without map:', error);
    restaurantsMapRoot.innerHTML =
      '<div class="map-empty-state">Karttaa ei voitu ladata t&auml;ss&auml; ymp&auml;rist&ouml;ss&auml;.</div>';
  }
}

function saveRestaurantCache(restaurants) {
  localStorage.setItem(RESTAURANTS_CACHE_KEY, JSON.stringify(restaurants));
}

function getFavouriteRestaurantIds() {
  const currentUser = getCurrentUser();
  return Array.isArray(currentUser?.favouriteRestaurants)
    ? currentUser.favouriteRestaurants
    : [];
}

function isFavouriteRestaurant(restaurantId) {
  return getFavouriteRestaurantIds().includes(restaurantId);
}

function getVisibleRestaurants() {
  let visibleRestaurants = filterRestaurants(allRestaurants, currentSearchTerm);

  if (selectedCity !== 'all') {
    visibleRestaurants = visibleRestaurants.filter(
      restaurant => optionValue(getRestaurantCity(restaurant)) === selectedCity
    );
  }

  if (selectedProvider !== 'all') {
    visibleRestaurants = visibleRestaurants.filter(
      restaurant =>
        optionValue(getRestaurantProvider(restaurant)) === selectedProvider
    );
  }

  if (!showOnlyFavorites) {
    return visibleRestaurants;
  }

  const favouriteIds = new Set(getFavouriteRestaurantIds());
  return visibleRestaurants.filter(restaurant =>
    favouriteIds.has(getRestaurantId(restaurant))
  );
}

function renderRestaurantCard(restaurant) {
  const restaurantId = getRestaurantId(restaurant);
  const favouriteClass = isFavouriteRestaurant(restaurantId)
    ? 'is-favourite'
    : '';
  const nearestClass = restaurantId === nearestRestaurantId ? 'is-nearest' : '';
  const heartLabel = isFavouriteRestaurant(restaurantId)
    ? 'Poista suosikeista'
    : 'Lisää suosikiksi';
  const nearestBadge =
    restaurantId === nearestRestaurantId
      ? '<span class="nearest-badge">Lähin</span>'
      : '';

  return `
    <div class="restaurant-item ${favouriteClass} ${nearestClass}" data-id="${restaurantId}" role="button" tabindex="0">
      <div class="restaurant-main">
        <div class="restaurant-name">${getRestaurantName(restaurant)} ${nearestBadge}</div>
        <div class="restaurant-address">${restaurant.address || ''}</div>
      </div>
      <button
        type="button"
        class="favorite-btn ${favouriteClass}"
        data-favorite-id="${restaurantId}"
        aria-label="${heartLabel}"
      >
        ${isFavouriteRestaurant(restaurantId) ? '♥' : '♡'}
      </button>
    </div>
  `;
}

function refreshRestaurantList() {
  const visibleRestaurants = getVisibleRestaurants();
  updateNearestRestaurant(visibleRestaurants);
  displayRestaurants(visibleRestaurants);
  if (isMapReady) {
    mapController.update({
      restaurants: visibleRestaurants,
      selectedRestaurantId,
      nearestRestaurantId,
      onSelectRestaurant: selectRestaurant,
    });
  }
}

/**
 * Initialize the app
 */
async function init() {
  await initializeMap();

  const currentUser = requireAuth();
  if (!currentUser) {
    return;
  }

  if (heroProfileName) {
    heroProfileName.textContent = currentUser.username || 'Opiskelija';
  }

  if (heroAvatar) {
    heroAvatar.src = currentUser.avatar || '../../img/picture8.jpg';
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logout();
      window.location.href = 'login.html';
    });
  }

  try {
    // Load restaurants on startup
    await loadRestaurants();
    requestUserLocation();

    // Event listeners
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') handleSearch();
    });

    cityFilter?.addEventListener('change', () => {
      selectedCity = cityFilter.value;
      refreshRestaurantList();
    });

    providerFilter?.addEventListener('change', () => {
      selectedProvider = providerFilter.value;
      refreshRestaurantList();
    });

    viewFilterButtons.forEach(button => {
      button.addEventListener('click', () => {
        showOnlyFavorites = button.dataset.filter === 'favorites';
        viewFilterButtons.forEach(filterButton => {
          filterButton.classList.toggle(
            'active',
            filterButton.dataset.filter === button.dataset.filter
          );
        });
        refreshRestaurantList();
      });
    });

    dailyBtn.addEventListener('click', () => {
      isDaily = true;
      updateMenuTypeButtons();
      if (selectedRestaurantId) {
        loadMenu(selectedRestaurantId);
      }
    });

    weeklyBtn.addEventListener('click', () => {
      isDaily = false;
      updateMenuTypeButtons();
      if (selectedRestaurantId) {
        loadMenu(selectedRestaurantId);
      }
    });
  } catch (error) {
    console.error('Error initializing app:', error);
    showError('Sovelluksen alustus epäonnistui');
  }
}

/**
 * Load all restaurants
 */
async function loadRestaurants() {
  try {
    restaurantsList.innerHTML =
      '<div class="loading">Ladataan ravintoloita...</div>';
    allRestaurants = normalizeRestaurants(await getRestaurants());
    allRestaurants = sortRestaurants(allRestaurants);
    saveRestaurantCache(allRestaurants);
    initializeFilterOptions(allRestaurants);
    refreshRestaurantList();
  } catch (error) {
    console.error('Error loading restaurants:', error);
    allRestaurants = MOCK_RESTAURANTS;
    saveRestaurantCache(allRestaurants);
    initializeFilterOptions(allRestaurants);
    refreshRestaurantList();
    restaurantsList.insertAdjacentHTML(
      'beforebegin',
      '<div class="empty" style="margin-bottom: 1rem;">API ei vastannut, näytetään demodata.</div>'
    );
  }
}

/**
 * Display restaurants in the sidebar
 */
function displayRestaurants(restaurants) {
  if (restaurants.length === 0) {
    const hasSearch = currentSearchTerm.trim().length > 0;
    const hasAdvancedFilters =
      selectedCity !== 'all' || selectedProvider !== 'all';
    let emptyMessage = 'Ravintolalista on tyhjä';

    if (showOnlyFavorites && hasSearch) {
      emptyMessage = 'Ei suosikkiravintoloita tällä haulla';
    } else if (showOnlyFavorites && hasAdvancedFilters) {
      emptyMessage = 'Ei suosikkeja valituilla filttereillä';
    } else if (showOnlyFavorites) {
      emptyMessage = 'Sinulla ei ole vielä suosikkiravintoloita';
    } else if (hasSearch && hasAdvancedFilters) {
      emptyMessage = 'Ei ravintoloita tällä haulla ja valituilla filttereillä';
    } else if (hasAdvancedFilters) {
      emptyMessage = 'Ei ravintoloita valituilla filttereillä';
    } else if (hasSearch) {
      emptyMessage = 'Ei ravintoloita tällä haulla';
    }

    restaurantsList.innerHTML = `<div class="empty">${emptyMessage}</div>`;
    return;
  }

  restaurantsList.innerHTML = restaurants.map(renderRestaurantCard).join('');

  // Add click listeners to restaurant items
  document.querySelectorAll('.restaurant-item').forEach(item => {
    item.addEventListener('click', () => {
      selectRestaurant(item.dataset.id);
    });
  });

  document.querySelectorAll('.favorite-btn').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      const restaurantId = button.dataset.favoriteId;
      toggleFavouriteRestaurant(restaurantId);
      refreshRestaurantList();
    });
  });

  document.querySelectorAll('.restaurant-item').forEach(item => {
    item.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectRestaurant(item.dataset.id);
      }
    });
  });
}

/**
 * Handle search
 */
function handleSearch() {
  currentSearchTerm = searchInput.value;
  refreshRestaurantList();
}

/**
 * Select a restaurant and load its menu
 */
async function selectRestaurant(restaurantId) {
  selectedRestaurantId = restaurantId;

  // Update UI - highlight selected restaurant
  document.querySelectorAll('.restaurant-item').forEach(item => {
    item.classList.remove('active');
  });
  document
    .querySelector(`[data-id="${restaurantId}"]`)
    ?.classList.add('active');

  if (isMapReady) {
    mapController.update({
      restaurants: getVisibleRestaurants(),
      selectedRestaurantId,
      nearestRestaurantId,
      onSelectRestaurant: selectRestaurant,
    });
  }

  // Load and display menu
  await loadMenu(restaurantId);
}

/**
 * Load menu for selected restaurant
 */
async function loadMenu(restaurantId) {
  try {
    menuContent.innerHTML = '<div class="loading">Ladataan ruokalista...</div>';

    const menu = isDaily
      ? await getDailyMenu(restaurantId, 'fi')
      : await getWeeklyMenu(restaurantId, 'fi');

    displayMenu(normalizeMenu(menu));
  } catch (error) {
    console.error('Error loading menu:', error);
    displayMenu(
      isDaily ? mockDailyMenu(restaurantId) : mockWeeklyMenu(restaurantId)
    );
    menuContent.insertAdjacentHTML(
      'afterbegin',
      '<div class="empty" style="margin-bottom: 1rem;">API ei vastannut, näytetään demoruokalista.</div>'
    );
  }
}

/**
 * Display menu content
 */
function displayMenu(menu) {
  if (!menu) {
    menuContent.innerHTML = '<div class="empty">Ei ruokalista saatavilla</div>';
    return;
  }

  const restaurantName =
    allRestaurants.find(r => getRestaurantId(r) === selectedRestaurantId)
      ?.name || 'Ravintola';
  const menuType = isDaily ? 'Päivän ruokalista' : 'Viikon ruokalista';

  // Handle different menu structures
  let menuHtml = `<h2>${restaurantName}</h2><h3>${menuType}</h3>`;

  if (Array.isArray(menu.courses)) {
    menuHtml += '<ul class="meals-list">';
    menu.courses.forEach(course => {
      menuHtml += `<li class="meal-item">
        <span class="meal-name">${course?.name || 'Tuntematon'}</span>
        <span class="meal-price">${[course?.price, course?.diets].filter(Boolean).join(' · ')}</span>
      </li>`;
    });
    menuHtml += '</ul>';
  } else if (Array.isArray(menu.days)) {
    // Weekly menu with days
    menuHtml += '<div class="weekly-menu">';
    menu.days.forEach(dayEntry => {
      const dayTitle = dayEntry?.date || 'Päivä';
      const courses = Array.isArray(dayEntry?.courses) ? dayEntry.courses : [];
      menuHtml += `<div class="day-menu">
        <h4>${dayTitle}</h4>
        <ul class="meals-list">`;
      if (courses.length > 0) {
        courses.forEach(course => {
          menuHtml += `<li class="meal-item">
            <span class="meal-name">${course?.name || 'Tuntematon'}</span>
            <span class="meal-price">${[course?.price, course?.diets].filter(Boolean).join(' · ')}</span>
          </li>`;
        });
      } else {
        menuHtml +=
          '<li class="meal-item"><span class="meal-name">Ei ruokalajeja</span></li>';
      }
      menuHtml += '</ul></div>';
    });
    menuHtml += '</div>';
  } else {
    menuHtml += '<p>Ruokalista ei ole käytettävässä muodossa</p>';
  }

  menuContent.innerHTML = menuHtml;
}

/**
 * Update menu type button states
 */
function updateMenuTypeButtons() {
  if (isDaily) {
    dailyBtn.classList.add('active');
    weeklyBtn.classList.remove('active');
    dailyBtn.setAttribute('aria-pressed', 'true');
    weeklyBtn.setAttribute('aria-pressed', 'false');
  } else {
    dailyBtn.classList.remove('active');
    weeklyBtn.classList.add('active');
    dailyBtn.setAttribute('aria-pressed', 'false');
    weeklyBtn.setAttribute('aria-pressed', 'true');
  }
}

/**
 * Show error message
 */
function showError(message) {
  menuContent.innerHTML = `<div class="error">${message}</div>`;
}

// Start the app
init();
