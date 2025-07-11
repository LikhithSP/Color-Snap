// Global variables
let currentColor = null;
let currentFormat = 'hex';
let colorHistory = [];
let favoriteColors = [];
let currentTheme = 'light';

// Initialize the extension
document.addEventListener('DOMContentLoaded', async function() {
  await loadStoredData();
  setupEventListeners();
  updateUI();
  initializeTheme();
});

// Load stored data from Chrome storage
async function loadStoredData() {
  try {
    const result = await chrome.storage.local.get(['colorHistory', 'favoriteColors', 'theme']);
    colorHistory = result.colorHistory || [];
    favoriteColors = result.favoriteColors || [];
    currentTheme = result.theme || 'light';
  } catch (error) {
    console.error('Error loading stored data:', error);
  }
}

// Save data to Chrome storage
async function saveData() {
  try {
    await chrome.storage.local.set({
      colorHistory: colorHistory,
      favoriteColors: favoriteColors,
      theme: currentTheme
    });
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// Setup all event listeners
function setupEventListeners() {
  // Color picker
  document.getElementById('pick-color').addEventListener('click', pickColor);
  
  // Format buttons
  document.querySelectorAll('.format-tab').forEach(btn => {
    btn.addEventListener('click', () => changeFormat(btn.dataset.format));
  });
  
  // Action buttons
  document.getElementById('copy-color').addEventListener('click', copyColor);
  document.getElementById('save-favorite').addEventListener('click', saveFavorite);
  
  // Tab buttons
  document.querySelectorAll('.tab-item').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  
  // Clear buttons
  document.getElementById('clear-history').addEventListener('click', clearHistory);
  document.getElementById('clear-favorites').addEventListener('click', clearFavorites);
  
  // Theme toggle
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
}

// Color picker functionality
async function pickColor() {
  try {
    const eyeDropper = new EyeDropper();
    const result = await eyeDropper.open();
    const colorCode = result.sRGBHex;

    currentColor = hexToRgb(colorCode);
    addToHistory(colorCode);
    displayColor();
    document.getElementById('color-display').classList.remove('hidden');
  } catch (error) {
    console.error('Error picking color:', error);
  }
}

// Color format conversion functions
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

// Format color based on current format
function formatColor(color) {
  if (!color) return '';
  
  switch (currentFormat) {
    case 'hex':
      return rgbToHex(color.r, color.g, color.b);
    case 'rgb':
      return `rgb(${color.r}, ${color.g}, ${color.b})`;
    case 'hsl':
      const hsl = rgbToHsl(color.r, color.g, color.b);
      return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    default:
      return rgbToHex(color.r, color.g, color.b);
  }
}

// Display the current color
function displayColor() {
  if (!currentColor) return;
  
  const colorCode = formatColor(currentColor);
  const hexColor = rgbToHex(currentColor.r, currentColor.g, currentColor.b);
  
  document.getElementById('color-code').textContent = colorCode;
  document.getElementById('color-preview').style.backgroundColor = hexColor;
}

// Change color format
function changeFormat(format) {
  currentFormat = format;
  
  // Update active format button
  document.querySelectorAll('.format-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.format === format);
  });
  
  displayColor();
}

// Copy color to clipboard
function copyColor() {
  const colorCode = document.getElementById('color-code').textContent;
  navigator.clipboard.writeText(colorCode).then(() => {
    const copyBtn = document.getElementById('copy-color');
    const originalContent = copyBtn.innerHTML;
    copyBtn.classList.add('success');
    copyBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <polyline points="20,6 9,17 4,12" stroke="currentColor" stroke-width="2"/>
      </svg>
      Copied!
    `;
    
    setTimeout(() => {
      copyBtn.innerHTML = originalContent;
      copyBtn.classList.remove('success');
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy color:', err);
  });
}

// Save color to favorites
function saveFavorite() {
  if (!currentColor) return;
  
  const hexColor = rgbToHex(currentColor.r, currentColor.g, currentColor.b);
  
  if (!favoriteColors.includes(hexColor)) {
    favoriteColors.unshift(hexColor);
    if (favoriteColors.length > 20) favoriteColors.pop(); // Limit to 20 favorites
    
    saveData();
    updateFavoritesDisplay();
    
    const saveBtn = document.getElementById('save-favorite');
    const originalContent = saveBtn.innerHTML;
    saveBtn.classList.add('success');
    saveBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <polyline points="20,6 9,17 4,12" stroke="currentColor" stroke-width="2"/>
      </svg>
      Saved!
    `;
    
    setTimeout(() => {
      saveBtn.innerHTML = originalContent;
      saveBtn.classList.remove('success');
    }, 2000);
  }
}

// Add color to history
function addToHistory(hexColor) {
  if (!colorHistory.includes(hexColor)) {
    colorHistory.unshift(hexColor);
    if (colorHistory.length > 20) colorHistory.pop(); // Limit to 20 history items
    
    saveData();
    updateHistoryDisplay();
  }
}

// Switch between tabs
function switchTab(tabName) {
  // Update active tab button
  document.querySelectorAll('.tab-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // Update visible tab panel
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `${tabName}-tab`);
  });
}

// Update history display
// Update history display
function updateHistoryDisplay() {
  const historyContainer = document.getElementById('color-history');
  if (colorHistory.length === 0) {
    historyContainer.innerHTML = `
      <div class="empty-state">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2"/>
        </svg>
        <p>No colors picked yet</p>
      </div>
    `;
    return;
  }
  historyContainer.innerHTML = colorHistory.map(color => 
    `<div class="color-item" data-color="${color}" style="background-color: ${color}" title="${color}">
       <button class="remove-btn" data-remove="${color}">×</button>
     </div>`
  ).join('');
}

// Update favorites display
// Update favorites display
function updateFavoritesDisplay() {
  const favoritesContainer = document.getElementById('color-favorites');
  if (favoriteColors.length === 0) {
    favoritesContainer.innerHTML = `
      <div class="empty-state">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" stroke-width="2"/>
        </svg>
        <p>No favorite colors saved</p>
      </div>
    `;
    return;
  }
  favoritesContainer.innerHTML = favoriteColors.map(color => 
    `<div class="color-item" data-color="${color}" style="background-color: ${color}" title="${color}">
       <button class="remove-btn" data-remove="${color}">×</button>
     </div>`
  ).join('');
}

// Event delegation for color history and favorites
document.addEventListener('click', function(e) {
  // History panel
  if (e.target.closest('#color-history .color-item')) {
    const color = e.target.closest('.color-item').getAttribute('data-color');
    if (e.target.classList.contains('remove-btn')) {
      e.stopPropagation();
      colorHistory = colorHistory.filter(c => c !== color);
      saveData();
      updateHistoryDisplay();
    } else {
      currentColor = hexToRgb(color);
      displayColor();
      document.getElementById('color-display').classList.remove('hidden');
    }
  }
  // Favorites panel
  if (e.target.closest('#color-favorites .color-item')) {
    const color = e.target.closest('.color-item').getAttribute('data-color');
    if (e.target.classList.contains('remove-btn')) {
      e.stopPropagation();
      favoriteColors = favoriteColors.filter(c => c !== color);
      saveData();
      updateFavoritesDisplay();
    } else {
      currentColor = hexToRgb(color);
      displayColor();
      document.getElementById('color-display').classList.remove('hidden');
    }
  }
});

// Clear all history
function clearHistory() {
  colorHistory = [];
  saveData();
  updateHistoryDisplay();
}

// Clear all favorites
function clearFavorites() {
  favoriteColors = [];
  saveData();
  updateFavoritesDisplay();
}

// Theme management functions
function initializeTheme() {
  applyTheme(currentTheme);
  updateThemeToggleIcon();
}

function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(currentTheme);
  updateThemeToggleIcon();
  saveData();
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function updateThemeToggleIcon() {
  const sunIcon = document.querySelector('.sun-icon');
  const moonIcon = document.querySelector('.moon-icon');
  
  if (currentTheme === 'dark') {
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
  } else {
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
  }
}

// Update UI
function updateUI() {
  updateHistoryDisplay();
  updateFavoritesDisplay();
}
