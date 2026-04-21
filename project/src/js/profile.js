import {getCurrentUser, logout, requireAuth, setUserAvatar} from './auth.js';

const user = requireAuth();

if (user) {
  const usernameEl = document.getElementById('profileUsername');
  const emailEl = document.getElementById('profileEmail');
  const heroNameEl = document.getElementById('profileHeroName');
  const avatarImg = document.getElementById('profileAvatar');
  const avatarInput = document.getElementById('avatarInput');

  usernameEl.textContent = user.username;
  heroNameEl.textContent = user.username;
  emailEl.textContent = user.email || '-';

  if (avatarImg) {
    avatarImg.src = user.avatar || '../../img/picture8.jpg';
  }

  if (avatarInput) {
    avatarInput.addEventListener('change', event => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const avatarDataUrl = String(reader.result || '');
        setUserAvatar(avatarDataUrl);
        if (avatarImg) {
          avatarImg.src = avatarDataUrl;
        }
      };
      reader.readAsDataURL(file);
    });
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
