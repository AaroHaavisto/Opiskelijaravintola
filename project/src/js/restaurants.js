/**
 * Main restaurants page logic
 */

import {
  getRestaurants,
  getDailyMenu,
  getWeeklyMenu,
} from '../api/restaurants.js';
import {filterRestaurants, sortRestaurants} from '../utils/search.js';

let allRestaurants = [];
let selectedRestaurantId = null;
let isDaily = true; // true = daily, false = weekly

const MOCK_RESTAURANTS = [
  {
    _id: 'mock-1',
    name: 'Metropolia Myyrmäki',
    address: 'Jukka Mallin katu 18',
    city: 'Vantaa',
  },
  {
    _id: 'mock-2',
    name: 'Metropolia Myllypuro',
    address: 'Myllypurontie 1',
    city: 'Helsinki',
  },
  {
    _id: 'mock-3',
    name: 'Unicafe Kaivopiha',
    address: 'Yliopistonkatu 3',
    city: 'Helsinki',
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

function formatCourse(course) {
  const parts = [course?.name].filter(Boolean);

  if (course?.price) {
    parts.push(course.price);
  }

  if (course?.diets) {
    parts.push(course.diets);
  }

  return parts.join(' · ');
}

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const dailyBtn = document.getElementById('dailyBtn');
const weeklyBtn = document.getElementById('weeklyBtn');
const restaurantsList = document.getElementById('restaurantsList');
const menuContent = document.getElementById('menuContent');

/**
 * Initialize the app
 */
async function init() {
  try {
    // Load restaurants on startup
    await loadRestaurants();

    // Event listeners
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') handleSearch();
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
    displayRestaurants(allRestaurants);
  } catch (error) {
    console.error('Error loading restaurants:', error);
    allRestaurants = MOCK_RESTAURANTS;
    displayRestaurants(allRestaurants);
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
    restaurantsList.innerHTML =
      '<div class="empty">Ei ravintoloita löytynyt</div>';
    return;
  }

  restaurantsList.innerHTML = restaurants
    .map(
      restaurant => `
    <button class="restaurant-item" data-id="${getRestaurantId(restaurant)}">
      <div class="restaurant-name">${getRestaurantName(restaurant)}</div>
      <div class="restaurant-address">${restaurant.address || ''}</div>
    </button>
  `
    )
    .join('');

  // Add click listeners to restaurant items
  document.querySelectorAll('.restaurant-item').forEach(item => {
    item.addEventListener('click', () => {
      selectRestaurant(item.dataset.id);
    });
  });
}

/**
 * Handle search
 */
function handleSearch() {
  const searchTerm = searchInput.value;
  const filtered = filterRestaurants(allRestaurants, searchTerm);
  displayRestaurants(filtered);
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
