# Opiskelijaravintolat - Arkkitehtuuri

## Kansiorakenne

```
project/
├── css/
│   ├── login_style.css          # Login-sivun tyylitiedosto
│   ├── main_style.css           # Pääsivu tyylitiedosto
│   ├── profile_style.css        # Profiili-sivun tyylitiedosto
│   └── restaurants_style.css    # Ravintolasivun tyylitiedosto
│
├── img/                         # Kuvat ja media
│
├── src/
│   ├── api/
│   │   └── restaurants.js       # API-kutsut ravintoloille ja ruokalistoille
│   │
│   ├── js/
│   │   └── restaurants.js       # Ravintolasivun päälogiikka
│   │
│   ├── utils/
│   │   └── search.js            # Hakutoiminnot (suodatus, lajittelu)
│   │
│   └── view/
│       ├── login.html           # Kirjautumissivukomponentti
│       ├── main.html            # Pääsivukomponentti
│       ├── profile.html         # Profiilisivukomponentti
│       └── restaurants.html     # Ravintolasivukomponentti
```

## Modulit

### API Service (`src/api/restaurants.js`)

Käsittelee kaikki API-kutsut:

- `getRestaurants()` - Hakee kaikki ravintolat
- `getRestaurant(id)` - Hakee yhden ravintolan tiedot
- `getDailyMenu(id, lang)` - Hakee päivän ruokalistan
- `getWeeklyMenu(id, lang)` - Hakee viikon ruokalistan

**Konfiguraatio**: Muuta `API_BASE_URL` muuttuja API-osoitteeksi.

### Utils (`src/utils/search.js`)

Hakutoiminnallisuus:

- `filterRestaurants(restaurants, searchTerm)` - Suodattaa ravintoloita hakusanan mukaan
- `sortRestaurants(restaurants)` - Lajittelee ravintolat aakkosjärjestykseen

### Main Logic (`src/js/restaurants.js`)

Ravintolasivun interaktiivinen logiikka:

- Lataa ravintolat sivun avatessa
- Näyttää ravintolat sivupalkissa
- Hakutoiminnallisuus
- Päivä/viikko-valinta
- Ruokalistan näyttäminen

## Käyttöohje

1. Avaa `restaurants.html` selaimessa
2. Ravintolat ladataan automaattisesti
3. Valitse ravintola nähdäksesi ruokalistan
4. Valitse "Päivän ruokalista" tai "Viikon ruokalista"
5. Käytä hakua ravintoloiden etsimiseen

## Seuraavat vaiheet

- [ ] Integroida todellinen API-osoite
- [ ] Lisätä autentikointi (login-sivu)
- [ ] Lisätä suosikit-toiminnallisuus
- [ ] Lisätä ravintola-tiedot (aukioloajat, yhteystiedot)
- [ ] Julkaista users.metropolia.fi palvelimelle
