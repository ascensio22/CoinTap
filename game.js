/**
 * CoinTap — Game Logic
 * Telegram Mini App Idle Clicker Game
 */

(function() {
  'use strict';

  // ========================================
  // Game State
  // ========================================

  const STORAGE_KEY = 'coinTapGameState';
  const CLOUD_STORAGE_KEY = 'gameState';

  let gameState = {
    coins: 0,
    clickPower: 1,
    clickPowerLevel: 0,
    autoClickLevel: 0,
    autoClickPower: 0,
    lastSaveTime: Date.now()
  };

  // Upgrade formula: cost = floor(10 * 1.5^level)
  function getUpgradeCost(level) {
    return Math.floor(10 * Math.pow(1.5, level));
  }

  function getClickPowerUpgradeCost(level) {
    return Math.floor(15 * Math.pow(1.6, level));
  }

  // ========================================
  // DOM Elements
  // ========================================

  const elements = {
    coinAmount: document.getElementById('coinAmount'),
    clickBtn: document.getElementById('clickBtn'),
    clickBtnHint: document.querySelector('.click-btn-hint'),
    floatingCoins: document.getElementById('floatingCoins'),
    autoClickIcon: document.getElementById('autoClickIcon'),
    autoClickLevel: document.getElementById('autoClickLevel'),
    autoClickRate: document.getElementById('autoClickRate'),
    upgradeBtn: document.getElementById('upgradeBtn'),
    upgradeCost: document.getElementById('upgradeCost'),
    clickPowerLevel: document.getElementById('clickPowerLevel'),
    clickPowerRate: document.getElementById('clickPowerRate'),
    clickPowerUpgradeBtn: document.getElementById('clickPowerUpgradeBtn'),
    clickPowerUpgradeCost: document.getElementById('clickPowerUpgradeCost'),
    soundToggle: document.getElementById('soundToggle'),
    themeToggle: document.getElementById('themeToggle'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    errorOverlay: document.getElementById('errorOverlay'),
    errorText: document.getElementById('errorText'),
    retryBtn: document.getElementById('retryBtn'),
    offlineModal: document.getElementById('offlineModal'),
    offlineEarnings: document.getElementById('offlineEarnings'),
    collectBtn: document.getElementById('collectBtn')
  };

  // ========================================
  // Telegram Integration
  // ========================================

  let tg = null;
  let isTelegramEnv = false;

  // ========================================
  // Sound System (Web Audio API)
  // ========================================

  let audioContext = null;
  let soundEnabled = true;

  function initAudio() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
  }

  function playSound(type) {
    if (!soundEnabled) return;

    try {
      const ctx = initAudio();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (type === 'click') {
        playClickSound(ctx);
      } else if (type === 'upgrade') {
        playUpgradeSound(ctx);
      }
    } catch (e) {
      console.warn('[CoinTap] Sound playback failed:', e);
    }
  }

  function playClickSound(ctx) {
    // Light "ding" - short high-frequency sine wave
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    oscillator.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }

  function playUpgradeSound(ctx) {
    // Success "whoosh" - frequency sweep with noise
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(300, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.25);
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    updateSoundButton();
    saveSoundSetting();
    return soundEnabled;
  }

  function updateSoundButton() {
    if (soundEnabled) {
      elements.soundToggle.classList.remove('sound-off');
      elements.soundToggle.setAttribute('aria-label', '关闭音效');
    } else {
      elements.soundToggle.classList.add('sound-off');
      elements.soundToggle.setAttribute('aria-label', '开启音效');
    }
  }

  async function loadSoundSetting() {
    try {
      const saved = await storage.get('soundEnabled');
      if (saved !== null) {
        soundEnabled = saved === 'true';
      }
    } catch (e) {
      // Use default (enabled)
    }
    updateSoundButton();
  }

  async function saveSoundSetting() {
    try {
      await storage.set('soundEnabled', String(soundEnabled));
    } catch (e) {
      console.warn('[CoinTap] Sound setting save failed:', e);
    }
  }

  function initTelegram() {
    try {
      // Check if SDK failed to load
      if (window.TelegramWebAppFailed) {
        console.warn('[CoinTap] Telegram WebApp SDK failed to load');
        return false;
      }

      if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        isTelegramEnv = true;

        // Check if we have valid initData (required for Telegram environment)
        if (!tg.initData || tg.initData === '') {
          console.warn('[CoinTap] Telegram initData is empty - may not be in Telegram environment');
          // Still return true as we have the SDK, just no user context
          return true;
        }

        // Notify Telegram that the app is ready
        tg.ready();

        // Apply theme
        applyTelegramTheme();

        // Expand to full height
        tg.expand();

        console.log('[CoinTap] Telegram WebApp initialized, initData length:', tg.initData.length);
        return true;
      } else {
        console.warn('[CoinTap] Telegram WebApp not available - SDK may not be loaded');
      }
    } catch (e) {
      console.error('[CoinTap] Telegram WebApp initialization error:', e);
    }
    return false;
  }

  function applyTelegramTheme() {
    if (!tg) return;

    const themeParams = tg.themeParams;
    if (!themeParams) return;

    const root = document.documentElement;

    // Map Telegram theme to CSS variables
    if (themeParams.bg_color) {
      const bgColor = themeParams.bg_color;
      root.style.setProperty('--bg-primary', bgColor);
      // Calculate secondary bg
      root.style.setProperty('--bg-secondary', adjustColor(bgColor, -0.05));
    }

    if (themeParams.text_color) {
      root.style.setProperty('--text-primary', themeParams.text_color);
    }

    if (themeParams.hint_color) {
      root.style.setProperty('--text-secondary', themeParams.hint_color);
    }

    if (themeParams.button_color) {
      root.style.setProperty('--accent-primary', themeParams.button_color);
    }

    if (themeParams.button_text_color) {
      root.style.setProperty('--accent-hover', themeParams.button_text_color);
    }

    // Set dark theme if Telegram is in dark mode
    if (tg.colorScheme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    }
  }

  function adjustColor(hex, amount) {
    // Simple color adjustment for secondary backgrounds
    return hex;
  }

  // ========================================
  // Storage
  // ========================================

  function getStorage() {
    return {
      async get(key) {
        // Try Telegram Cloud Storage first
        if (isTelegramEnv && tg && tg.cloudStorage) {
          try {
            // Add timeout for cloud storage operations
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('CloudStorage timeout')), 3000)
            );
            const value = await Promise.race([
              tg.cloudStorage.getItem(key),
              timeoutPromise
            ]);
            if (value !== null && value !== undefined) {
              return value;
            }
          } catch (e) {
            console.warn('[CoinTap] CloudStorage read failed, falling back to localStorage:', e.message);
          }
        }
        // Fallback to localStorage
        return localStorage.getItem(key);
      },

      async set(key, value) {
        // Try Telegram Cloud Storage first
        if (isTelegramEnv && tg && tg.cloudStorage) {
          try {
            // Add timeout for cloud storage operations
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('CloudStorage timeout')), 3000)
            );
            await Promise.race([
              tg.cloudStorage.setItem(key, value),
              timeoutPromise
            ]);
            return;
          } catch (e) {
            console.warn('[CoinTap] CloudStorage write failed, falling back to localStorage:', e.message);
          }
        }
        // Fallback to localStorage
        localStorage.setItem(key, value);
      }
    };
  }

  const storage = getStorage();

  // ========================================
  // Game Logic
  // ========================================

  function formatNumber(num) {
    if (num >= 100000000) {
      return (num / 100000000).toFixed(1) + 'Y';
    }
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + 'W';
    }
    return num.toLocaleString();
  }

  function updateDisplay() {
    elements.coinAmount.textContent = formatNumber(gameState.coins);
    elements.autoClickLevel.textContent = 'Lv.' + gameState.autoClickLevel;
    elements.autoClickRate.textContent = '+' + gameState.autoClickPower + '/sec';

    const cost = getUpgradeCost(gameState.autoClickLevel);
    elements.upgradeCost.textContent = formatNumber(cost);
    elements.upgradeBtn.disabled = gameState.coins < cost;

    // Update click power upgrade display
    elements.clickPowerLevel.textContent = 'Lv.' + gameState.clickPowerLevel;
    elements.clickPowerRate.textContent = '+' + gameState.clickPower + '/click';
    const clickPowerCost = getClickPowerUpgradeCost(gameState.clickPowerLevel);
    elements.clickPowerUpgradeCost.textContent = formatNumber(clickPowerCost);
    elements.clickPowerUpgradeBtn.disabled = gameState.coins < clickPowerCost;

    // Update click button hint
    elements.clickBtnHint.textContent = '+' + gameState.clickPower;

    // Update auto click icon animation
    if (gameState.autoClickPower > 0) {
      elements.autoClickIcon.classList.add('pulse');
    } else {
      elements.autoClickIcon.classList.remove('pulse');
    }
  }

  function createFloatingCoin(x, y, amount) {
    const coin = document.createElement('div');
    coin.className = 'floating-coin';
    coin.textContent = '+' + amount;
    coin.style.left = (x - 12) + 'px';
    coin.style.top = (y - 12) + 'px';
    elements.floatingCoins.appendChild(coin);

    setTimeout(() => {
      coin.remove();
    }, 1000);
  }

  function handleClick(event) {
    gameState.coins += gameState.clickPower;
    updateDisplay();
    saveGame();

    // Create floating coin at click position
    const rect = elements.clickBtn.getBoundingClientRect();
    const x = event.clientX || (rect.left + rect.width / 2);
    const y = event.clientY || (rect.top + rect.height / 2);
    createFloatingCoin(x, y, gameState.clickPower);

    // Sound feedback
    playSound('click');

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }

  function handleUpgrade() {
    const cost = getUpgradeCost(gameState.autoClickLevel);

    if (gameState.coins >= cost) {
      gameState.coins -= cost;
      gameState.autoClickLevel++;
      gameState.autoClickPower = gameState.autoClickLevel;

      updateDisplay();
      saveGame();

      // Visual feedback
      elements.upgradeBtn.classList.add('success');
      setTimeout(() => {
        elements.upgradeBtn.classList.remove('success');
      }, 300);

      // Sound feedback
      playSound('upgrade');

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([20, 50, 20]);
      }
    }
  }

  function handleClickPowerUpgrade() {
    const cost = getClickPowerUpgradeCost(gameState.clickPowerLevel);

    if (gameState.coins >= cost) {
      gameState.coins -= cost;
      gameState.clickPowerLevel++;
      gameState.clickPower = 1 + gameState.clickPowerLevel;

      updateDisplay();
      saveGame();

      // Visual feedback
      elements.clickPowerUpgradeBtn.classList.add('success');
      setTimeout(() => {
        elements.clickPowerUpgradeBtn.classList.remove('success');
      }, 300);

      // Sound feedback
      playSound('upgrade');

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([20, 50, 20]);
      }
    }
  }

  // Auto click tick - runs every 100ms for smooth display
  let lastAutoClickTick = Date.now();

  function autoClickTick() {
    if (gameState.autoClickPower <= 0) return;

    const now = Date.now();
    // Only add coins once per second
    if (now - lastAutoClickTick >= 1000) {
      gameState.coins += gameState.autoClickPower;
      gameState.lastSaveTime = now;
      lastAutoClickTick = now;
      updateDisplay();
    }
  }

  // ========================================
  // Save / Load
  // ========================================

  async function saveGame() {
    try {
      gameState.lastSaveTime = Date.now();
      await storage.set(STORAGE_KEY, JSON.stringify(gameState));
    } catch (e) {
      console.error('[CoinTap] Save failed:', e);
    }
  }

  async function loadGame() {
    try {
      const saved = await storage.get(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);
        gameState = { ...gameState, ...parsed };

        // Calculate offline earnings
        const now = Date.now();
        const offlineTime = (now - gameState.lastSaveTime) / 1000; // seconds

        if (offlineTime > 10 && gameState.autoClickPower > 0) {
          const offlineEarnings = Math.floor(gameState.autoClickPower * offlineTime);
          showOfflineModal(offlineEarnings);
        }

        gameState.lastSaveTime = now;
        console.log('[CoinTap] Game loaded:', gameState);
      }
    } catch (e) {
      console.error('[CoinTap] Load failed:', e);
    }
  }

  // ========================================
  // Offline Modal
  // ========================================

  let pendingOfflineEarnings = 0;

  function showOfflineModal(earnings) {
    pendingOfflineEarnings = earnings;
    elements.offlineEarnings.textContent = formatNumber(earnings);
    elements.offlineModal.hidden = false;
  }

  function hideOfflineModal() {
    elements.offlineModal.hidden = true;
  }

  function collectOfflineEarnings() {
    if (pendingOfflineEarnings > 0) {
      gameState.coins += pendingOfflineEarnings;
      pendingOfflineEarnings = 0;
      updateDisplay();
      saveGame();
    }
    hideOfflineModal();
  }

  // ========================================
  // Theme Toggle
  // ========================================

  function toggleTheme() {
    const root = document.documentElement;
    const current = root.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
  }

  // ========================================
  // Error Handling
  // ========================================

  function showError(message) {
    elements.errorText.textContent = message;
    elements.errorOverlay.hidden = false;
    elements.loadingOverlay.classList.add('hidden');
  }

  function hideError() {
    elements.errorOverlay.hidden = true;
  }

  // ========================================
  // Initialization
  // ========================================

  function bindEvents() {
    elements.clickBtn.addEventListener('click', handleClick);
    elements.clickBtn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      handleClick(e.touches[0]);
    }, { passive: false });

    elements.upgradeBtn.addEventListener('click', handleUpgrade);
    elements.clickPowerUpgradeBtn.addEventListener('click', handleClickPowerUpgrade);
    elements.soundToggle.addEventListener('click', toggleSound);
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.retryBtn.addEventListener('click', function() {
      hideError();
      elements.loadingOverlay.classList.remove('hidden');
      init();
    });
    elements.collectBtn.addEventListener('click', collectOfflineEarnings);

    // Save before page unload
    window.addEventListener('beforeunload', function() {
      saveGame();
    });

    // Visibility change - save when app goes to background
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') {
        saveGame();
      }
    });
  }

  async function init() {
    console.log('[CoinTap] Initializing...');

    try {
      // Initialize Telegram first
      initTelegram();

      // Load saved game
      await loadGame();

      // Load sound setting
      await loadSoundSetting();

      // Update display
      updateDisplay();

      console.log('[CoinTap] Ready!');
    } catch (e) {
      console.error('[CoinTap] Init error:', e);
    } finally {
      // Always hide loading, even if something failed
      elements.loadingOverlay.classList.add('hidden');
    }
  }

  // Start the game
  try {
    bindEvents();

    // Auto click interval (every 100ms for smooth counter)
    setInterval(autoClickTick, 100);

    // Auto save interval (every 30 seconds)
    setInterval(saveGame, 30000);

    // Initialize after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  } catch (e) {
    console.error('[CoinTap] Initialization error:', e);
    showError('游戏加载失败，请刷新页面');
  }

})();
