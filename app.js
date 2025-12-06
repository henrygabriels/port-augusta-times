/**
 * THE PORT AUGUSTA TIMES - CHAOS ENGINE
 * Powering the most unhinged local newspaper on the internet
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  articlesPath: './articles/',
  pollInterval: 30000, // Check for new articles every 30 seconds
  totalExpectedArticles: 75,
  sectionNames: {
    '1_local_government': { name: 'Local Government', icon: '' },
    '2_business': { name: 'Business & Economy', icon: '' },
    '3_education': { name: 'Education & Schools', icon: '' },
    '4_public_safety': { name: 'Public Safety & Crime', icon: '' },
    '5_sports': { name: 'Sports & Recreation', icon: '' },
    '6_community': { name: 'Community & Lifestyle', icon: '' },
    '7_health': { name: 'Health & Wellness', icon: '' },
    '8_opinion': { name: 'Opinion & Editorials', icon: '' },
    '9_environment': { name: 'Environment', icon: '' },
    '10_transportation': { name: 'Transportation', icon: '' }
  },
  breakingNewsItems: [
    "COUNCIL APPROVES $30 MILLION FLOOD COUNTER-FLOW INVESTMENT BUNDLE!!!",
    "MAYOR TEMPLINS REVEALS VISION FOR HARBOUR REDEVELOPMENT!!!",
    "LOCAL BOWLER DYLAN HART SIGNS NATIONAL CONTRACT!!!",
    "TENDAK HILL HIGH RECEIVES UNPRECEDENTED FUNDING BOOST!!!",
    "47 DEGREES EXPECTED TOMORROW - OFFICIALS SAY 'SLIGHTLY WARM'!!!",
    "MYSTERIOUS PONG CONTINUES TO BAFFLE SCIENTISTS!!!",
    "PORT AUGUSTA SAINTS 3-2 IN THRILLING TIDEBREAKER WIN!!!",
    "NEW LIBRARY LOAN PROGRAMME REDOUBLES COMMUNITY HOURS!!!",
    "CYCLING LEGEND 'DUKE JOE' SMASHES SAND TRACK RECORD!!!",
    "PLASTIC-FREE MALL PROMISES $1M RECYCLING DRIVE!!!"
  ]
};

// ============================================
// STATE
// ============================================
let articles = [];
let knownArticleFiles = new Set();
let chaosMode = false;
let elegantMode = true;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initializePage();
});

async function initializePage() {
  // Enforce Elegant Mode UI
  document.body.classList.add('elegant-mode');
  const masthead = document.querySelector('.masthead h1');
  if (masthead) masthead.textContent = 'The Port Augusta Times';
  updateNavigationForMode();

  // Set the date
  setDateLine();

  // Start the news ticker
  initNewsTicker();

  // Load initial articles
  await loadArticles();

  // Load random sidebar ad
  loadRandomSidebarAd();

  // Start polling for new articles
  startArticlePolling();

  // Default to elegant mode
  enableElegantModeByDefault();

  // Hide loading screen
  setTimeout(() => {
    document.getElementById('loadingScreen').classList.add('hidden');
  }, 1500);
}

// ============================================
// DATE LINE
// ============================================
function setDateLine() {
  const dateLine = document.getElementById('dateLine');
  if (!dateLine) return;

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const now = new Date();
  now.setDate(now.getDate() + 2); // 2 days in the future

  dateLine.textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

// ============================================
// NEWS TICKER
// ============================================
function initNewsTicker() {
  const ticker = document.getElementById('newsTicker');
  if (!ticker) return;

  let currentIndex = 0;
  
  const showNextItem = () => {
    // Show current item
    ticker.innerHTML = `<span>${CONFIG.breakingNewsItems[currentIndex]}</span>`;
    
    // Increment index for next time
    currentIndex = (currentIndex + 1) % CONFIG.breakingNewsItems.length;
  };

  // Initial show
  showNextItem();

  // Update every 5 seconds
  setInterval(showNextItem, 5000);
}

// ============================================
// ARTICLE LOADING
// ============================================
async function loadArticles() {
  try {
    const response = await fetch('./articles.json');
    if (!response.ok) {
      throw new Error('Failed to load articles.json');
    }
    const json_articles = await response.json();

    articles = json_articles
      .filter(a => a.content && a.content.trim().length > 0)
      .map(article_data => {
      // Re-seed random for consistent isHot/isFeatured if not already set
      if (article_data.isHot === undefined || article_data.isFeatured === undefined) {
          const seed = hashCode(article_data.filename);
          random.seed(seed);
          article_data.isHot = random.random() < 0.3;
          article_data.isFeatured = random.random() < 0.1;
      }
      return article_data;
    });

    // Ensure knownArticleFiles is populated for polling logic
    knownArticleFiles = new Set(articles.map(a => a.filename));

    renderArticles();
    updateArticleCounter();

  } catch (error) {
    console.error('Error loading articles:', error);
    // Fallback to pattern loading is no longer necessary if articles.json is the source of truth.
    // However, if articles.json itself fails, there's no dynamic way to get articles.
    // For now, we'll let it fail visibly if articles.json is missing.
  }
}

// remove loadArticlesByPattern as it is no longer needed


function extractSectionFromFilename(filename) {
  const match = filename.match(/^(\d+_[a-z_]+)/);
  return match ? match[1] : 'unknown';
}

function extractPreview(content) {
  // Remove markdown formatting and get first ~150 chars
  const cleaned = content
    .replace(/^#+\s+.+$/gm, '') // Remove headers
    .replace(/\*\*/g, '') // Remove bold
    .replace(/\*/g, '') // Remove italic
    .replace(/\[.*?\]\(.*?\)/g, '') // Remove links
    .replace(/[|>-]/g, '') // Remove table chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  return cleaned.substring(0, 150) + (cleaned.length > 150 ? '...' : '');
}

// ============================================
// ARTICLE RENDERING
// ============================================
function renderArticles() {
  const grid = document.getElementById('articlesGrid');
  if (!grid) return;

  // Filter out linked articles for the homepage view
  const mainArticles = articles.filter(article => !article.filename.startsWith('articles/linked_'));

  // Sort by section, then randomize a bit for chaos
  const sortedArticles = [...mainArticles].sort((a, b) => {
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    return Math.random() - 0.5; // Chaos sort!
  });

  grid.innerHTML = sortedArticles.map(article => createArticleCard(article)).join('');

  // Animate new articles
  setTimeout(() => {
    document.querySelectorAll('.article-card.new-article').forEach(card => {
      card.classList.remove('new-article');
    });
  }, 500);
}

function createArticleCard(article) {
  const sectionInfo = CONFIG.sectionNames[article.section] || { name: 'News', icon: '📰' };
  const articleUrl = `article.html?file=${encodeURIComponent(article.filename)}`;
  const stockImage = getStockImageForArticle(article);

  const classes = [
    'article-card',
    article.isNew ? 'new-article' : '',
    article.isFeatured ? 'featured' : '',
    article.isHot ? 'hot' : ''
  ].filter(Boolean).join(' ');

  return `
    <article class="${classes}">
      <a href="${articleUrl}" class="article-card-image-link">
        <div class="article-card-image" style="background-image: url('${stockImage}'); background-size: cover; background-position: center;">
        </div>
      </a>
      <div class="article-card-content">
        <span class="article-card-section">${sectionInfo.name}</span>
        <h3><a href="${articleUrl}" class="headline-link">${article.headline}</a></h3>
        <p>${article.preview}</p>
        <a href="${articleUrl}" class="read-more">
          READ MORE →
        </a>
      </div>
    </article>
  `;
}

// Get relevant stock image based on article section and keywords
function getStockImageForArticle(article) {
  // Use Lorem Picsum with deterministic seed based on filename for consistent images
  const seed = hashCode(article.filename);
  const width = 400;
  const height = 250;

  // Section-specific image searches using Unsplash Source (free, no API key needed)
  const sectionKeywords = {
    '1_local_government': ['government', 'city-hall', 'meeting', 'council', 'politics'],
    '2_business': ['business', 'office', 'money', 'commercial', 'shop'],
    '3_education': ['school', 'classroom', 'students', 'library', 'education'],
    '4_public_safety': ['police', 'fire', 'safety', 'emergency', 'security'],
    '5_sports': ['sports', 'football', 'running', 'athletics', 'stadium'],
    '6_community': ['community', 'people', 'festival', 'celebration', 'neighborhood'],
    '7_health': ['health', 'hospital', 'medical', 'wellness', 'doctor'],
    '8_opinion': ['newspaper', 'writing', 'debate', 'discussion', 'opinion'],
    '9_environment': ['nature', 'environment', 'trees', 'landscape', 'sustainability'],
    '10_transportation': ['road', 'transport', 'traffic', 'bus', 'infrastructure']
  };

  const keywords = sectionKeywords[article.section] || ['news', 'newspaper'];
  const keyword = keywords[Math.abs(seed) % keywords.length];

  // Use LoremFlickr for relevant images (supports keywords and locking)
  return `https://loremflickr.com/${width}/${height}/${keyword}?lock=${seed}`;
}

// Simple hash function for consistent image seeds
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

function getArticleIcon(section) {
  const icons = {
    '1_local_government': '',
    '2_business': '',
    '3_education': '',
    '4_public_safety': '',
    '5_sports': '',
    '6_community': '',
    '7_health': '',
    '8_opinion': '',
    '9_environment': '',
    '10_transportation': ''
  };
  return icons[section] || '';
}

// ============================================
// ARTICLE COUNTER
// ============================================
function updateArticleCounter() {
  const counter = document.getElementById('articleCount');
  if (counter) {
    counter.textContent = articles.length;

    // Flash effect when count changes
    counter.style.transform = 'scale(1.3)';
    setTimeout(() => {
      counter.style.transform = 'scale(1)';
    }, 200);
  }
}

// ============================================
// POLLING FOR NEW ARTICLES
// ============================================
function startArticlePolling() {
  setInterval(async () => {
    const previousCount = articles.length;
    
    // Re-fetch all articles to check for updates (simulates new articles)
    await loadArticles();

    if (articles.length > previousCount) {
      console.log(`🆕 New articles detected! Total: ${articles.length}`);
      renderArticles();
      updateArticleCounter();

      // Flash a notification
      showNewArticleNotification(articles.length - previousCount);
    }
  }, CONFIG.pollInterval);
}

function showNewArticleNotification(count) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: linear-gradient(135deg, #ff1493, #ff6b35);
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    font-family: 'Bangers', cursive;
    font-size: 1.2rem;
    z-index: 10000;
    animation: slideIn 0.5s ease-out;
    box-shadow: 0 5px 20px rgba(255, 20, 147, 0.5);
  `;
  notification.innerHTML = `🆕 ${count} NEW ARTICLE${count > 1 ? 'S' : ''} JUST IN!`;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideIn 0.5s ease-out reverse';
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// ============================================
// FAKE POPUP
// ============================================
function showFakePopup() {
  document.getElementById('popupOverlay').classList.add('show');
  document.getElementById('fakePopup').classList.add('show');
}

function closePopup() {
  document.getElementById('popupOverlay').classList.remove('show');
  document.getElementById('fakePopup').classList.remove('show');
  alert('🎉 Congratulations! Your FREE newspaper will arrive in 4-6 business centuries!');
}

// ============================================
// CHAOS MODE
// ============================================
function toggleChaos() {
  chaosMode = !chaosMode;
  document.body.classList.toggle('chaos-mode', chaosMode);

  const btn = document.getElementById('chaosBtn');
  if (chaosMode) {
    btn.textContent = '🌀 STOP THE CHAOS';
    playChaosSounds();
  } else {
    btn.textContent = '🌀 CHAOS MODE';
  }
}

function playChaosSounds() {
  // Create an oscillator for chaotic sounds
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 440;
    oscillator.type = 'square';
    gainNode.gain.value = 0.1;

    oscillator.start();

    // Chaos frequency changes
    const chaosInterval = setInterval(() => {
      if (!chaosMode) {
        oscillator.stop();
        clearInterval(chaosInterval);
        return;
      }
      oscillator.frequency.value = 200 + Math.random() * 600;
    }, 100);

    // Stop after 2 seconds regardless
    setTimeout(() => {
      oscillator.stop();
      clearInterval(chaosInterval);
    }, 2000);

  } catch (e) {
    console.log('Audio not available');
  }
}



// ============================================
// ARTICLE PAGE FUNCTIONS
// ============================================
async function loadSingleArticle() {
  const params = new URLSearchParams(window.location.search);
  const filename = params.get('file');

  if (!filename) {
    showArticleError('No article specified!');
    return;
  }

  // Ensure articles are loaded before trying to find one
  if (articles.length === 0) {
      await loadArticles();
  }

  // Handle potential double prefixing if the URL param already has 'articles/'
  const searchFilename = filename.startsWith('articles/') ? filename : `articles/${filename}`;
  const article = articles.find(a => a.filename === searchFilename);

  if (!article) {
    showArticleError('Article not found! Maybe it was too hot to handle. 🔥');
    return;
  }

  renderSingleArticle(article.content, article.filename, article);
}

function renderSingleArticle(content_text, filename_param, article_obj) {
  const article = article_obj; // Use the passed article object directly
  const sectionInfo = CONFIG.sectionNames[article.section] || { name: 'News', icon: '📰' };
  const stockImage = getStockImageForArticle(article);

  const container = document.getElementById('articleContent');
  if (!container) return;

  // Generate random fake data
  const authorNames = ['Janet Pemberton', 'Harold McNugget', 'Beatrice Woolsworth', 'Chester Buttonfly', 'Muriel Sandcastle'];
  const author = authorNames[Math.floor(Math.random() * authorNames.length)];
  const readTime = Math.floor(Math.random() * 15) + 3;

  container.innerHTML = `
    <article class="article-page">
      <header class="article-header">
        <span class="article-card-section">${sectionInfo.name}</span>
        <h1>${article.headline}</h1>
        <div class="article-meta">
          <span>By ${author}</span>
          <span>${getRandomDate()}</span>
          <span>${readTime} min read</span>
          <span>${Math.floor(Math.random() * 10000)} views</span>
        </div>
      </header>

      <div class="article-main-image" style="margin: 20px 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
         <img src="${stockImage}" alt="Relevant stock photo" style="width: 100%; height: auto; display: block; max-height: 500px; object-fit: cover;">
      </div>
      
      <div class="article-content">
        ${convertContentToHTML(article.content)}
      </div>
      
      <div class="share-buttons">
        <h4>📢 SHARE THIS ARTICLE</h4>
        <button class="share-btn facebook" onclick="alert('Facebook says: Please verify you are not a robot by solving 47 CAPTCHAs')">📘 Facebook</button>
        <button class="share-btn twitter" onclick="alert('Tweet sent! (It was not actually sent)')">🐦 Twitter</button>
        <button class="share-btn email" onclick="alert('Email client not found. Have you tried turning it off and on again?')">📧 Email</button>
        <button class="share-btn print" onclick="window.print()">🖨️ Print</button>
      </div>
      
      <div id="interactionSection" class="interaction-section">
        <!-- Comments or Related Articles will be loaded here -->
      </div>
    </article>
  `;

  // Update page title
  document.title = `${article.headline} | The Port Augusta Times`;

  // Load interactions (Comments or Related Articles)
  loadArticleInteractions(article);
}

function convertContentToHTML(content) {
  // Basic markdown to HTML conversion
  return content
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^\|.*\|$/gm, match => `<div style="font-family: monospace; background: rgba(0,0,0,0.3); padding: 5px; margin: 5px 0;">${match}</div>`)
    .replace(/^/gm, '')
    .split('\n')
    .filter(line => line.trim())
    .map(line => line.startsWith('<') ? line : `<p>${line}</p>`)
    .join('\n');
}

function getRandomDate() {
  const months = ['January', 'February', 'March', 'Marchuary', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const day = Math.floor(Math.random() * 28) + 1;
  const month = months[Math.floor(Math.random() * months.length)];
  const year = 2024 + Math.floor(Math.random() * 2);
  return `${day} ${month} ${year}`;
}

async function loadArticleInteractions(article) {
  const container = document.getElementById('interactionSection');
  if (!container) return;

  const isLinkedArticle = article.filename.startsWith('articles/linked_');

  if (isLinkedArticle) {
    // Show Related Articles for Linked Articles
    renderRelatedArticles(container);
  } else {
    // Show Comments for Regular Articles
    const commentsFilename = article.filename
      .replace('articles/', 'comments/')
      .replace('.txt', '_comments.json');
    
    try {
      const response = await fetch(commentsFilename);
      if (response.ok) {
        const comments = await response.json();
        renderComments(container, comments);
      } else {
        // Fallback if no comments file found
        container.innerHTML = '<div class="comments-section"><h4>💬 COMMENTS (0)</h4><p>No comments yet. Be the first to not comment!</p></div>';
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      container.innerHTML = '<div class="comments-section"><h4>💬 COMMENTS (Error)</h4><p>Comments currently unavailable due to atmospheric interference.</p></div>';
    }
  }
}

function renderComments(container, comments) {
  if (!comments || comments.length === 0) {
    container.innerHTML = '<div class="comments-section"><h4>💬 COMMENTS (0)</h4><p>No comments yet.</p></div>';
    return;
  }

  const commentsHTML = comments.map(c => `
    <div class="comment">
      <div class="comment-author">${c.username}</div>
      <div class="comment-text">${c.comment}</div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="comments-section">
      <h4>💬 COMMENTS (${comments.length})</h4>
      ${commentsHTML}
    </div>
  `;
}

function renderRelatedArticles(container) {
  // Filter for regular articles only (not linked ones) to avoid endless rabbit holes
  const regularArticles = articles.filter(a => !a.filename.startsWith('articles/linked_'));
  
  // Select 3 random articles
  const related = [];
  const pool = [...regularArticles];
  
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * pool.length);
    related.push(pool[randomIndex]);
    pool.splice(randomIndex, 1);
  }

  const relatedHTML = related.map(article => {
    const articleUrl = `article.html?file=${encodeURIComponent(article.filename)}`;
    const stockImage = getStockImageForArticle(article);
    
    return `
      <div class="related-article-card">
        <a href="${articleUrl}" style="text-decoration: none; color: inherit;">
          <div class="related-image" style="background-image: url('${stockImage}');"></div>
          <div class="related-content">
            <h5>${article.headline}</h5>
            <span class="read-more-small">READ MORE →</span>
          </div>
        </a>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="related-articles-section">
      <h4>RELATED ARTICLES</h4>
      <div class="related-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 20px;">
        ${relatedHTML}
      </div>
    </div>
  `;
}

function showArticleError(message) {
  const container = document.getElementById('articleContent');
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📰❌</div>
        <h3>${message}</h3>
        <p>Why not check out our <a href="index.html" style="color: var(--cyber-blue);">homepage</a> instead?</p>
      </div>
    `;
  }
}

// ============================================
// SECTION PAGE FUNCTIONS
// ============================================
async function loadSectionArticles() {
  const params = new URLSearchParams(window.location.search);
  const section = params.get('section');

  if (!section) {
    window.location.href = 'index.html';
    return;
  }

  // Ensure articles are loaded before trying to filter
  if (articles.length === 0) {
      await loadArticles();
  }

  const sectionInfo = CONFIG.sectionNames[section] || { name: 'News', icon: '📰' };

  // Update header
  const header = document.getElementById('sectionHeader');
  if (header) {
    header.innerHTML = `
      <h1>${sectionInfo.name}</h1>
    `;
  }

  // Filter to this section
  const sectionArticles = articles.filter(a => a.section === section);

  const grid = document.getElementById('sectionArticlesGrid');
  if (grid) {
    if (sectionArticles.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">📭</div>
          <h3>No articles yet!</h3>
          <p>Our award-winning journalists are still typing furiously. Check back soon!</p>
        </div>
      `;
    } else {
      grid.innerHTML = sectionArticles.map(article => createArticleCard(article)).join('');
    }
  }

  // Update document title
  document.title = `${sectionInfo.name} | The Port Augusta Times`;

  // Start polling
  startArticlePolling();
}

// ============================================
// HOROSCOPES PAGE FUNCTIONS
// ============================================
async function loadHoroscopes() {
  const container = document.getElementById('horoscopeContent');
  if (!container) return;

  try {
    const response = await fetch('horoscopes.txt');
    if (!response.ok) throw new Error('Stars aligned against us');

    const text = await response.text();
    
    // Add a fun header
    let html = ``;

    // Process the text with some chaotic formatting
    html += convertHoroscopeToHTML(text);

    container.innerHTML = html;

  } catch (error) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🌑</div>
        <h3>The stars are silent today.</h3>
        <p>Or we just couldn't find the file. Try again later!</p>
      </div>
    `;
  }
}

function convertHoroscopeToHTML(text) {
  // Simple markdown-ish parser for the horoscope file
  return text
    .replace(/^#+\s+(.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^> (.+)$/gm, '<blockquote style="border-left: 4px solid var(--accent-color); margin: 10px 0; padding-left: 10px; font-style: italic;">$1</blockquote>')
    .replace(/^---$/gm, '<hr style="border: 0; border-top: 1px dashed #ccc; margin: 20px 0;">')
    .split('\n')
    .map(line => {
      line = line.trim();
      if (!line) return '';
      if (line.startsWith('<') && !line.startsWith('<small') && !line.startsWith('</')) return line;
      return `<p>${line}</p>`;
    })
    .join('');
}

// ============================================
// ELEGANT MODE
// ============================================

// Enable elegant mode by default on page load
function enableElegantModeByDefault() {
  elegantMode = true;
  document.body.classList.add('elegant-mode');

  // Update masthead
  const masthead = document.querySelector('.masthead h1');
  if (masthead) {
    masthead.textContent = 'The Port Augusta Times';
  }

  // Update elegant button to show it's active
  const elegantBtn = document.getElementById('elegantBtn');
  if (elegantBtn) {
    elegantBtn.textContent = '🌙 CHAOS MODE';
    elegantBtn.style.background = 'linear-gradient(135deg, #c41e3a, #d63250)';
  }

  // Update navigation to elegant style
  updateNavigationForMode();

  // Hide the toggle buttons (make them easter eggs)
  hideToggleButtons();
}

// Hide toggle buttons - they're easter eggs now!
function hideToggleButtons() {
  const elegantBtn = document.getElementById('elegantBtn');
  const chaosBtn = document.getElementById('chaosBtn');

  if (elegantBtn) {
    elegantBtn.style.opacity = '0';
    elegantBtn.style.transform = 'translateX(-100px)';
    elegantBtn.style.transition = 'all 0.3s ease';

    // Reveal on hover near the corner
    elegantBtn.addEventListener('mouseenter', () => {
      elegantBtn.style.opacity = '1';
      elegantBtn.style.transform = 'translateX(0)';
    });
  }

  if (chaosBtn) {
    chaosBtn.style.opacity = '0';
    chaosBtn.style.transform = 'translateX(100px)';
    chaosBtn.style.transition = 'all 0.3s ease';

    // Reveal on hover near the corner
    chaosBtn.addEventListener('mouseenter', () => {
      chaosBtn.style.opacity = '1';
      chaosBtn.style.transform = 'translateX(0)';
    });
  }

  // Add invisible hover zones to reveal the buttons
  createEasterEggZones();
}

// Create invisible hover zones at bottom corners to reveal easter egg buttons
function createEasterEggZones() {
  // Left zone for elegant button
  const leftZone = document.createElement('div');
  leftZone.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    width: 80px;
    height: 80px;
    z-index: 9998;
    cursor: default;
  `;
  leftZone.addEventListener('mouseenter', () => {
    const btn = document.getElementById('elegantBtn');
    if (btn) {
      btn.style.opacity = '1';
      btn.style.transform = 'translateX(0)';
    }
  });
  leftZone.addEventListener('mouseleave', () => {
    const btn = document.getElementById('elegantBtn');
    if (btn && !btn.matches(':hover')) {
      setTimeout(() => {
        if (!btn.matches(':hover')) {
          btn.style.opacity = '0';
          btn.style.transform = 'translateX(-100px)';
        }
      }, 500);
    }
  });

  // Right zone for chaos button
  const rightZone = document.createElement('div');
  rightZone.style.cssText = `
    position: fixed;
    bottom: 0;
    right: 0;
    width: 80px;
    height: 80px;
    z-index: 9998;
    cursor: default;
  `;
  rightZone.addEventListener('mouseenter', () => {
    const btn = document.getElementById('chaosBtn');
    if (btn) {
      btn.style.opacity = '1';
      btn.style.transform = 'translateX(0)';
    }
  });
  rightZone.addEventListener('mouseleave', () => {
    const btn = document.getElementById('chaosBtn');
    if (btn && !btn.matches(':hover')) {
      setTimeout(() => {
        if (!btn.matches(':hover')) {
          btn.style.opacity = '0';
          btn.style.transform = 'translateX(100px)';
        }
      }, 500);
    }
  });

  document.body.appendChild(leftZone);
  document.body.appendChild(rightZone);
}

function toggleElegant() {
  elegantMode = !elegantMode;
  document.body.classList.toggle('elegant-mode', elegantMode);

  // Turn off chaos mode if enabling elegant mode
  if (elegantMode && chaosMode) {
    chaosMode = false;
    document.body.classList.remove('chaos-mode');
    const chaosBtn = document.getElementById('chaosBtn');
    if (chaosBtn) chaosBtn.textContent = '🌀 CHAOS MODE';
  }

  const btn = document.getElementById('elegantBtn');
  if (btn) {
    if (elegantMode) {
      btn.textContent = '📰 CHAOS MODE';
      btn.style.background = 'linear-gradient(135deg, #c41e3a, #d63250)';
    } else {
      btn.textContent = '📰 ELEGANT MODE';
      btn.style.background = 'linear-gradient(135deg, #1a1a1a, #333)';
    }
  }

  // Update masthead text for elegant mode
  const masthead = document.querySelector('.masthead h1');
  if (masthead) {
    if (elegantMode) {
      masthead.textContent = 'The Port Augusta Times';
    } else {
      masthead.textContent = '📰 THE PORT AUGUSTA TIMES 📰';
    }
  }

  // Update navigation text
  updateNavigationForMode();
}

function updateNavigationForMode() {
  const navLinks = document.querySelectorAll('.nav-list a');
  const elegantLabels = {
    'index.html': elegantMode ? 'Home' : '🏠 HOME',
    'section.html?section=1_local_government': elegantMode ? 'Government' : '🏛️ GOVERNMENT',
    'section.html?section=2_business': elegantMode ? 'Business' : '💼 BUSINESS',
    'section.html?section=3_education': elegantMode ? 'Education' : '📚 EDUCATION',
    'section.html?section=4_public_safety': elegantMode ? 'Crime' : '🚔 CRIME',
    'section.html?section=5_sports': elegantMode ? 'Sports' : '⚽ SPORTS',
    'section.html?section=6_community': elegantMode ? 'Community' : '🎭 COMMUNITY',
    'section.html?section=7_health': elegantMode ? 'Health' : '🏥 HEALTH',
    'section.html?section=8_opinion': elegantMode ? 'Opinion' : '💬 OPINION',
    'horoscopes.html': elegantMode ? 'Horoscopes' : '🔮 HOROSCOPES',
    'section.html?section=9_environment': elegantMode ? 'Environment' : '🌿 ENVIRONMENT',
    'section.html?section=10_transportation': elegantMode ? 'Transport' : '🚗 TRANSPORT',
    'classifieds.html': elegantMode ? 'Classifieds' : '📋 CLASSIFIEDS',
    'advertisements.html': elegantMode ? 'Advertising' : '📢 ADS'
  };

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (elegantLabels[href]) {
      link.textContent = elegantLabels[href];
    }
  });
}

// ============================================
// CLASSIFIEDS & ADVERTS
// ============================================

async function loadClassifieds() {
  const container = document.getElementById('classifiedsContainer');
  if (!container) return;

  try {
    const response = await fetch('generated_classifieds.json');
    if (!response.ok) throw new Error('Failed to load');
    const ads = await response.json();
    
    if (!ads || ads.length === 0) throw new Error('No ads found');

    // Group by category
    const grouped = {};
    ads.forEach(ad => {
        const cat = ad.category || 'Miscellaneous';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(ad);
    });

    let html = '';
    for (const [category, items] of Object.entries(grouped)) {
        html += `<h2 class="section-title" style="margin-top: 40px;">${getCategoryIcon(category)} ${category.toUpperCase()}</h2>`;
        html += `<div class="classifieds-grid">`;
        items.forEach(ad => {
            const isUrgent = Math.random() < 0.2;
            html += `
            <div class="classified-ad ${isUrgent ? 'urgent' : ''}">
                <span class="classified-category">${ad.category}</span>
                <h3 class="classified-title">${ad.title}</h3>
                <div class="classified-price">${ad.price}</div>
                <p class="classified-details">${ad.details}</p>
                <div class="classified-contact">📞 ${ad.contact}</div>
            </div>`;
        });
        html += `</div>`;
    }
    container.innerHTML = html;
  } catch (e) {
      console.error(e);
      container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <h3>Classifieds Unavailable</h3>
            <p>The classifieds board blew away in the wind.</p>
        </div>`;
  }
}

function getCategoryIcon(cat) {
    return '';
}

async function loadAdverts() {
    const container = document.getElementById('advertsContainer');
    if (!container) return;

    try {
        const response = await fetch('generated_adverts.json');
        if (!response.ok) throw new Error('Failed to load');
        const ads = await response.json();
        
        if (!ads || ads.length === 0) throw new Error('No adverts found');

        const html = ads.map(ad => {
            // Generate random gradient
            const hue = Math.floor(Math.random() * 360);
            const bg = `linear-gradient(135deg, hsl(${hue}, 50%, 20%), hsl(${hue + 40}, 50%, 30%))`;
            
            return `
            <div class="showcase-ad" style="border-color: hsl(${hue}, 70%, 50%)">
                <div class="ad-header" style="background: ${bg}">
                    <h3>${ad.business_name}</h3>
                    <p class="slogan">"${ad.slogan}"</p>
                </div>
                <div class="ad-body">
                    <p>${ad.description}</p>
                    <div class="ad-special" style="background: hsl(${hue}, 70%, 50%); color: white; margin-top: 15px; padding: 10px; text-align: center; font-weight: bold;">
                        💥 ${ad.special_offer}
                    </div>
                </div>
                <div class="ad-contact">
                    📞 ${ad.contact}
                </div>
            </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    } catch (e) {
        console.error(e);
        container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <h3>Adverts Unavailable</h3>
            <p>Our advertisers have gone fishing.</p>
        </div>`;
    }
}

async function loadRandomSidebarAd() {
  const adWidget = document.querySelector('.sidebar-widget.ad-widget');
  if (!adWidget) return;

  try {
    const response = await fetch('generated_adverts.json');
    if (response.ok) {
      const ads = await response.json();
      if (ads && ads.length > 0) {
        const ad = ads[Math.floor(Math.random() * ads.length)];
        
        adWidget.innerHTML = `
          <h4>SPONSORED</h4>
          <p style="font-size: 1.3rem; font-weight: bold;">${ad.business_name}</p>
          <p style="font-style: italic;">"${ad.slogan}"</p>
          <p style="margin: 10px 0;">${ad.description}</p>
          <p style="font-weight: bold; color: var(--blood-red);">💥 ${ad.special_offer}</p>
          <p style="font-size: 0.8rem; margin-top: 10px;">
            📞 ${ad.contact}
          </p>
        `;
      }
    }
  } catch (e) {
    console.error("Failed to load sidebar ad", e);
  }
}

// ============================================
// EXPORT FOR GLOBAL ACCESS
// ============================================
window.closePopup = closePopup;
window.toggleChaos = toggleChaos;
window.toggleElegant = toggleElegant;
window.loadSingleArticle = loadSingleArticle;
window.loadSectionArticles = loadSectionArticles;
window.loadHoroscopes = loadHoroscopes;
window.loadClassifieds = loadClassifieds;
window.loadAdverts = loadAdverts;
window.loadRandomSidebarAd = loadRandomSidebarAd;
