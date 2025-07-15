/*
 * Odak.app is a clean, minimalist, and privacy-respecting writing app with live Markdown rendering—built to keep you in the flow. No accounts, no ads, no cloud, and no distractions. Everything is stored locally on your device.
 * v=1.7
 * Author: Araz Gholami @arazgholami
 * Email: contact@arazgholami.com
 */

let currentDocumentId = null;
let isTyping = false;
let typingTimer = null;
let soundEnabled = true;
let soundVolume = 0.5; 
let currentTheme = 'light'; // Default theme
let isFullscreen = false;
let documents = {};
let customBackground = null; 

let fontFamily = 'Vazir'; 
let fontSize = 120; 
let editorWidth = 830; 
let systemFonts = []; 
let useCustomBg = false; 

// Add function to handle typing state
function handleTypingState() {
  isTyping = true;
  toggleToolbarAndStatusbar('hide');
  
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    isTyping = false;
    toggleToolbarAndStatusbar('show');
  }, 2000); // Show UI elements after 2 seconds of no typing
}

MarkdownEditor.init('editor', {
  placeholder: 'What\'s in your mind?',
  autofocus: true
});

const editor = document.getElementById('editor');
const toolbar = document.getElementById('toolbar');
const topbar = document.getElementById('topbar');
const statusBar = document.getElementById('status-bar');
const settingsPopup = document.getElementById('settings-popup');
const counter = document.getElementById('counter');
const listPopup = document.getElementById('list-popup');
const documentsListElement = document.getElementById('documents-list');
const fileInput = document.getElementById('file-input');

// Add input event listener for typing
editor.addEventListener('input', () => {
  handleTypingState();
  updateCounter();
  
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    saveCurrentDocumentContent();
  }, 1000);
});

// Add mouse movement event listener to show UI elements
document.addEventListener('mousemove', () => {
  toggleToolbarAndStatusbar('show');
  
  // Reset the typing timer to keep UI visible
  if (isTyping) {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      isTyping = false;
    }, 2000);
  }
});

editor.addEventListener('keydown', handleKeyDown);

const sounds = {
  key: [
    new Audio('./assets/sounds/type-machine/key-new-01.mp3'),
    new Audio('./assets/sounds/type-machine/key-new-02.mp3'),
    new Audio('./assets/sounds/type-machine/key-new-03.mp3'),
    new Audio('./assets/sounds/type-machine/key-new-04.mp3'),
    new Audio('./assets/sounds/type-machine/key-new-05.mp3')
  ],
  space: new Audio('./assets/sounds/type-machine/space-new.mp3'),
  backspace: new Audio('./assets/sounds/type-machine/backspace.mp3'),
  return: new Audio('./assets/sounds/type-machine/return-new.mp3'),
  scrollUp: new Audio('./assets/sounds/type-machine/scrollUp.mp3'),
  scrollDown: new Audio('./assets/sounds/type-machine/scrollDown.mp3')
};

function init() {
  // Register service worker for offline functionality
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(error => {
        console.error('ServiceWorker registration failed: ', error);
      });
  }
  
  loadDocumentsFromStorage();  
  loadPreferences();  
  if (currentDocumentId && documents[currentDocumentId]) {
    loadDocument(currentDocumentId);
  } else {
    createNewDocument(true);
  }  
  updateCounter();  
  applyTheme();  
  applyBackground();
  updateBackgroundSelection();  
  initBootstrapTooltips();
  
  // Check if this is the first visit
  const hasSeenInfo = localStorage.getItem('odak_has_seen_info');
  if (!hasSeenInfo) {
    showInfoPopup();
  }
}

function loadDocumentsFromStorage() {
  const savedDocuments = localStorage.getItem('odak_documents');
  if (savedDocuments) {
    documents = JSON.parse(savedDocuments);
  }
  
  const lastDocumentId = localStorage.getItem('odak_current_document');
  if (lastDocumentId) {
    currentDocumentId = lastDocumentId;
  }
}

function loadPreferences() {
  
  const savedSoundVolume = localStorage.getItem('odak_sound_volume');
  if (savedSoundVolume !== null) {
    soundVolume = parseFloat(savedSoundVolume);
    document.getElementById('volume-slider').value = soundVolume * 100;
    document.getElementById('volume-value').textContent = Math.round(soundVolume * 100) + '%';
    soundEnabled = soundVolume > 0;
    updateSoundButton();
  } else {
    
    soundVolume = 0.2;
    document.getElementById('volume-slider').value = 70;
    document.getElementById('volume-value').textContent = '70%';
    updateSoundButton();
  }  
  const savedTheme = localStorage.getItem('odak_theme');
  if (savedTheme && ['light', 'dark', 'odak'].includes(savedTheme)) {
    currentTheme = savedTheme;
  } else {
    // Migrate from old theme system if needed
    const oldThemePref = localStorage.getItem('odak_dark_mode');
    if (oldThemePref !== null) {
      currentTheme = oldThemePref === 'true' ? 'dark' : 'light';
      localStorage.removeItem('odak_dark_mode');
      localStorage.setItem('odak_theme', currentTheme);
    }
  }
  applyTheme();  
  const savedFontFamily = localStorage.getItem('odak_font_family');
  if (savedFontFamily !== null) {
    fontFamily = savedFontFamily;
  }  
  const savedFontSize = localStorage.getItem('odak_font_size');
  if (savedFontSize !== null) {
    fontSize = parseInt(savedFontSize);
  }
  document.getElementById('font-size-slider').value = fontSize;
  updateFontSizeLabel();  
  const savedEditorWidth = localStorage.getItem('odak_editor_width');
  if (savedEditorWidth !== null) {
    editorWidth = parseInt(savedEditorWidth);
    document.getElementById('editor-width-input').value = editorWidth;
  }  
  try {
    const savedCustomBackground = localStorage.getItem('odak_custom_background');
    const savedUseCustomBg = localStorage.getItem('odak_use_custom_bg');
    
    if (savedCustomBackground && savedCustomBackground !== 'null') {
      customBackground = savedCustomBackground;
      
      
      const customBgElement = document.getElementById('custom-bg');
      customBgElement.style.backgroundImage = `url(${customBackground})`;
      customBgElement.classList.remove('hidden');
    }
    
    
    useCustomBg = savedUseCustomBg === 'true';
  } catch (error) {
    console.error('Error loading background settings:', error);
    useCustomBg = false;
    
    localStorage.removeItem('odak_custom_background');
    localStorage.setItem('odak_use_custom_bg', 'false');
  }  
  applySettings();
}


function handleKeyDown(e) {
  if (!soundEnabled) return;  
  if (e.key === 'Backspace') {
    playSound('backspace');
  } else if (e.key === 'Enter') {
    playSound('return');
  } else if (e.key === ' ') {
    playSound('space');
  } else if (e.key.length === 1) {
    playSound('key');
  }
  
  lastKeyPressed = e.key;
}

function playSound(type) {
  if (!soundEnabled) return;
  
  if (type === 'key') {
    
    const randomIndex = Math.floor(Math.random() * sounds.key.length);
    const sound = sounds.key[randomIndex].cloneNode();
    sound.volume = soundVolume / 3;
    sound.play();
  } else if (sounds[type]) {
    const sound = sounds[type].cloneNode();
    sound.volume = soundVolume / 3;
    sound.play();
  }
}


function toggleFullscreen() {
  if (!isFullscreen) {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
      document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
      document.documentElement.msRequestFullscreen();
    }
    document.getElementById('fullscreen-btn').innerHTML = '<i class="fas fa-compress"></i>';
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
    document.getElementById('fullscreen-btn').innerHTML = '<i class="fas fa-expand"></i>';
  }
  
  isFullscreen = !isFullscreen;
}

function setTheme(theme) {
  if (['light', 'dark', 'odak'].includes(theme)) {
    currentTheme = theme;
    localStorage.setItem('odak_theme', theme);
    applyTheme();
    updateActiveThemeButton();
  }
}

function updateActiveThemeButton() {
  document.querySelectorAll('.theme-btn').forEach(btn => {
    if (btn.dataset.theme === currentTheme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function applyTheme() {
  // Set the theme attribute on body
  document.body.setAttribute('data-theme', currentTheme);
  
  // Update theme stylesheet
  const themeLink = document.querySelector('link[href^="theme-"]');
  if (themeLink) {
    themeLink.href = `theme-${currentTheme}.css?v1.0`;
  }
  
  // Update UI elements
  updateActiveThemeButton();
}

function toggleSettings() {
  const fontSelect = document.getElementById('font-family-select');
  if (fontSelect && fontSelect.options.length === 0) {
    loadSystemFonts();
  }
  
  // Update the active state of theme buttons
  updateActiveThemeButton();
  
  // Update background selection
  updateBackgroundSelection();  
  
  // Toggle settings popup visibility
  settingsPopup.classList.toggle('hidden');
}

function loadSystemFonts() {
  const fontSelect = document.getElementById('font-family-select');  
  fontSelect.innerHTML = '';  
  const appFontOption = document.createElement('option');
  appFontOption.value = 'Vazir';
  appFontOption.textContent = 'Vazir (Default)';
  appFontOption.style.fontFamily = 'Vazir';  
  if (fontFamily === 'Vazir') {
    appFontOption.selected = true;
  }
  
  fontSelect.appendChild(appFontOption);  
  const separator = document.createElement('option');
  separator.disabled = true;
  separator.style.borderBottom = '1px solid #ccc';
  separator.textContent = '──────────────';
  fontSelect.appendChild(separator);  
  const defaultFonts = [
    'Arial', 'Brush Script MT', 'Courier New', 'cursive', 'fantasy', 'Garamond', 
    'Georgia', 'Helvetica', 'monospace', 'sans-serif', 'serif', 'system-ui',
    'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana'
  ];  
  defaultFonts.forEach(font => {
    const option = document.createElement('option');
    option.value = font;
    option.textContent = font;
    option.style.fontFamily = font;
    
    
    if (font === fontFamily) {
      option.selected = true;
    }
    
    fontSelect.appendChild(option);
  });  
  if (window.queryLocalFonts) {
    window.queryLocalFonts().then(fonts => {
      
      const uniqueFonts = new Set();
      
      fonts.forEach(font => {
        
        if (font.fullName.toLowerCase().includes('regular') || 
            font.fullName.toLowerCase().includes('normal')) {
          uniqueFonts.add(font.family);
        }
      });
      
      
      Array.from(uniqueFonts)
        .sort((a, b) => a.localeCompare(b))
        .forEach(font => {
          
          if (!defaultFonts.includes(font) && font !== 'Vazir') {
            const option = document.createElement('option');
            option.value = font;
            option.textContent = font;
            option.style.fontFamily = font;
            
            
            if (font === fontFamily) {
              option.selected = true;
            }
            
            fontSelect.appendChild(option);
          }
        });
    }).catch(err => {
      console.error('Error loading system fonts:', err);
    });
  }
}

function applySettings() {
  // Set base font family
  document.documentElement.style.setProperty('--editor-font-family', fontFamily);
  editor.style.fontFamily = `var(--editor-font-family), serif, 'Vazir'`;
  
  // Set base font size
  document.documentElement.style.setProperty('--base-font-size', fontSize + '%');
  editor.style.fontSize = 'var(--base-font-size)';
  
  // Calculate relative sizes
  const baseSize = fontSize / 100;
  document.documentElement.style.setProperty('--h1-font-size', `calc(1.802rem * ${baseSize})`);
  document.documentElement.style.setProperty('--h2-font-size', `calc(1.602rem * ${baseSize})`);
  document.documentElement.style.setProperty('--h3-font-size', `calc(1.266rem * ${baseSize})`);
  document.documentElement.style.setProperty('--div-font-size', `calc(1rem * ${baseSize})`);
  
  // Set editor width
  editor.style.maxWidth = editorWidth + 'px';
  
  // Apply font sizes to all elements
  const allElements = editor.querySelectorAll('*');
  allElements.forEach(element => {
    if (element.tagName === 'H1') {
      element.style.fontSize = 'var(--h1-font-size)';
    } else if (element.tagName === 'H2') {
      element.style.fontSize = 'var(--h2-font-size)';
    } else if (element.tagName === 'H3') {
      element.style.fontSize = 'var(--h3-font-size)';
    } else if (element.tagName === 'H4') {
      element.style.fontSize = 'calc(var(--h3-font-size) * 0.9)';
    } else if (element.tagName === 'H5') {
      element.style.fontSize = 'calc(var(--h3-font-size) * 0.8)';
    } else if (element.tagName === 'H6') {
      element.style.fontSize = 'calc(var(--h3-font-size) * 0.7)';
    } else if (element.tagName === 'DIV' || 
               element.tagName === 'P' || 
               element.tagName === 'LI' || 
               element.tagName === 'BLOCKQUOTE') {
      element.style.fontSize = 'var(--div-font-size)';
    }
  });
  
  // Apply background and theme
  applyBackground();
  updateBackgroundSelection();
}

function applyBackground() {
  if (useCustomBg && customBackground) {
    
    editor.style.backgroundImage = `url(${customBackground})`;
    editor.style.backgroundRepeat = 'no-repeat';
    editor.style.backgroundSize = 'cover';
    editor.style.backgroundPosition = 'center center';
  } else {
    
    editor.style.backgroundImage = '';
    editor.style.backgroundRepeat = '';
    editor.style.backgroundSize = '';
    editor.style.backgroundPosition = '';
    
    // Apply the current theme
    document.body.setAttribute('data-theme', currentTheme);
  }
}

function updateBackgroundSelection() {
  const defaultBg = document.getElementById('default-bg');
  const customBg = document.getElementById('custom-bg');
  
  if (!defaultBg || !customBg) return;  
  defaultBg.classList.remove('selected');
  customBg.classList.remove('selected');  
  if (useCustomBg && customBackground) {
    customBg.classList.add('selected');
  } else {
    defaultBg.classList.add('selected');
    
    useCustomBg = false;
  }  
  if (customBackground) {
    customBg.classList.remove('hidden');
    customBg.style.backgroundImage = `url(${customBackground})`;
    customBg.style.backgroundSize = 'cover';
    customBg.style.backgroundPosition = 'center center';
  } else {
    customBg.classList.add('hidden');
  }
}

function handleBackgroundUpload(e) {
  const file = e.target.files[0];
  if (!file) return;  
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file.');
    return;
  }  
  const reader = new FileReader();
  reader.onload = function(event) {
    
    const img = new Image();
    img.onload = function() {
      
      const canvas = document.createElement('canvas');
      
      
      const maxSize = 800;
      let width = img.width;
      let height = img.height;
      
      
      if (width > height && width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
      } else if (height > maxSize) {
        width = (width * maxSize) / height;
        height = maxSize;
      }
      
      
      canvas.width = width;
      canvas.height = height;
      
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      
      
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
      
      try {
        
        localStorage.setItem('odak_custom_background', compressedDataUrl);
        
        
        customBackground = compressedDataUrl;
        
        
        const customBgElement = document.getElementById('custom-bg');
        customBgElement.style.backgroundImage = `url(${customBackground})`;
        customBgElement.classList.remove('hidden');
        
        
        useCustomBg = true;
        localStorage.setItem('odak_use_custom_bg', 'true');
        
        
        updateBackgroundSelection();
        applyBackground();
      } catch (error) {
        
        if (error.name === 'QuotaExceededError') {
          alert('The image is too large to save. Please try a smaller image or clear some browser storage.');
        } else {
          alert('An error occurred: ' + error.message);
        }
        console.error('Error saving background image:', error);
      }
    };
    
    
    img.src = event.target.result;
  };  
  reader.readAsDataURL(file);  
  e.target.value = '';
}

function toggleSound() {
  const soundBtn = document.getElementById('sound-btn');
  const volumePopup = document.getElementById('volume-popup');  
  if (volumePopup.classList.contains('hidden')) {
    volumePopup.classList.remove('hidden');
    
    const btnRect = soundBtn.getBoundingClientRect();
    volumePopup.style.left = (btnRect.right + 115) + 'px';
    volumePopup.style.top = (btnRect.top + 10) + 'px';
  } else {
    volumePopup.classList.add('hidden');
  }
}

function updateSoundButton() {
  let iconClass = 'fa-volume-mute';
  
  if (soundVolume > 0) {
    soundEnabled = true;
    if (soundVolume < 0.1) {
      iconClass = 'fa-volume-off';
    } else if (soundVolume < 0.5) {
      iconClass = 'fa-volume-down';
    } else {
      iconClass = 'fa-volume-up';
    }
  } else {
    soundEnabled = false;
  }
  
  document.getElementById('sound-btn').innerHTML = `<i class="fas ${iconClass}"></i>`;
}

function createNewDocument(silent = false) {
  if (silent) {
    generateNewDocument()
  } else {
    if (confirm('Are you sure you want to create a new document? This action cannot be undone.')) {
      generateNewDocument()
    }
  }
}

function generateNewDocument() {
  const newId = 'doc_' + Date.now();  
  documents[newId] = {
    id: newId,
    title: 'Untitled Document',
    content: '',
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  };  
  currentDocumentId = newId;  
  saveDocumentsToStorage();  
  loadDocument(newId);  
  editor.focus();
}

function saveCurrentDocumentContent() {
  if (!currentDocumentId) return;
  const content = editor.innerHTML;
  let title = 'Untitled Document';
  const firstLine = editor.textContent.trim().split('\n')[0];
  if (firstLine) {
    title = firstLine.substring(0, 20);
  }  
  documents[currentDocumentId].title = title;
  documents[currentDocumentId].content = content;
  documents[currentDocumentId].updated = new Date().toISOString();  
  saveDocumentsToStorage();
}

function saveCurrentDocument() {
  if (!currentDocumentId) return;  
  const saveBtn = document.getElementById('save-btn');
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Saved';
  
  setTimeout(() => {
    saveBtn.textContent = originalText;
  }, 1500);
}

function saveDocumentTitle(id, newTitle) {
  if (!id || !documents[id]) return;  
  if (!newTitle.trim()) {
    newTitle = 'Untitled Document';
  }  
  documents[id].title = newTitle;
  documents[id].updated = new Date().toISOString();  
  saveDocumentsToStorage();
}

function saveDocumentsToStorage() {
  localStorage.setItem('odak_documents', JSON.stringify(documents));
  localStorage.setItem('odak_current_document', currentDocumentId);
}

function loadDocument(id) {
  if (!documents[id]) return;
  currentDocumentId = id;
  editor.innerHTML = documents[id].content;
  updateCounter();
  localStorage.setItem('odak_current_document', currentDocumentId);

  if (typeof initDraggableImages === 'function') {
    initDraggableImages(editor);
  }
}

function toggleDocumentsList() {
  
  updateDocumentsList();  
  listPopup.classList.toggle('hidden');
}

function updateDocumentsList() {
  
  documentsListElement.innerHTML = '';  
  const sortedDocs = Object.values(documents).sort((a, b) => {
    return new Date(b.updated) - new Date(a.updated);
  });  
  sortedDocs.forEach(doc => {
    const docItem = document.createElement('div');
    docItem.className = 'document-item';
    if (doc.id === currentDocumentId) {
      docItem.classList.add('active');
    }
    
    const docTitle = document.createElement('div');
    docTitle.className = 'document-title';
    docTitle.textContent = doc.title;
    docTitle.setAttribute('title', 'Double-click to rename');
    
    
    let clickTimer = null;
    let preventSingleClick = false;
    
    docTitle.addEventListener('click', (e) => {
      e.stopPropagation();
      
      if (preventSingleClick) {
        return;
      }
      
      
      if (docTitle.contentEditable === 'true') {
        return;
      }
      
      
      if (clickTimer === null) {
        clickTimer = setTimeout(() => {
          clickTimer = null;
          if (!preventSingleClick) {
            
            loadDocument(doc.id);
            listPopup.classList.add('hidden');
          }
        }, 300); 
      }
    });
    
    
    docTitle.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      
      
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
      }
      
      
      preventSingleClick = true;
      
      
      docTitle.contentEditable = true;
      docTitle.focus();
      
      
      const range = document.createRange();
      range.selectNodeContents(docTitle);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });
    
    
    docTitle.addEventListener('blur', () => {
      saveDocumentTitle(doc.id, docTitle.textContent.trim());
      docTitle.contentEditable = false;
      
      
      setTimeout(() => {
        preventSingleClick = false;
      }, 300);
    });
    
    docTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        docTitle.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        docTitle.textContent = doc.title; 
        docTitle.contentEditable = false;
        
        
        setTimeout(() => {
          preventSingleClick = false;
        }, 300);
      }
    });
    
    const docDate = document.createElement('div');
    docDate.className = 'document-date';
    docDate.textContent = formatDate(doc.updated);
    
    const docActions = document.createElement('div');
    docActions.className = 'document-actions';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.title = 'Delete';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Are you sure you want to delete this document?')) {
        deleteDocument(doc.id);
      }
    });
    
    const downloadBtn = document.createElement('button');
    downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
    downloadBtn.title = 'Download';
    downloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      downloadDocument(doc.id);
    });
    
    docActions.appendChild(downloadBtn);
    docActions.appendChild(deleteBtn);
    
    docItem.appendChild(docTitle);
    docItem.appendChild(docDate);
    docItem.appendChild(docActions);
    
    
    docItem.addEventListener('click', () => {
      loadDocument(doc.id);
      listPopup.classList.add('hidden');
    });
    
    documentsListElement.appendChild(docItem);
  });  
  if (sortedDocs.length === 0) {
    documentsListElement.innerHTML = '<div class="no-documents">No documents yet</div>';
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function deleteDocument(id) {
  
  delete documents[id];  
  saveDocumentsToStorage();  
  updateDocumentsList();  
  if (id === currentDocumentId) {
    createNewDocument(true);
  }
}

function downloadCurrentDocument() {
  if (!currentDocumentId) return;
  downloadDocument(currentDocumentId);
}

function downloadDocument(id) {
  if (!documents[id]) return;
  
  const doc = documents[id];
  const markdownContent = convertToMarkdown(doc.content);  
  const firstLine = markdownContent.split('\n')[0].replace(/^#\s+/, '').trim();
  const fileName = firstLine && firstLine.length > 0 ? 
    `${firstLine.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md` : 
    `${doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;  
  const blob = new Blob([markdownContent], {type: 'text/markdown'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadAllDocuments() {
  
  if (typeof JSZip === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.onload = () => {
      
      createAndDownloadZip();
    };
    document.head.appendChild(script);
  } else {
    
    createAndDownloadZip();
  }
}

function createAndDownloadZip() {
  const zip = new JSZip();
  const docs = Object.values(documents);  
  docs.forEach(doc => {
    
    const content = doc.content;
    
    const markdown = convertToMarkdown(content);
    
    const firstLine = markdown.split('\n')[0].replace(/^#\s+/, '').trim();
    const fileName = firstLine && firstLine.length > 0 ? 
      `${firstLine}.md` : 
      `${doc.title}.md`;
    
    
    zip.file(fileName, markdown);
  });  
  zip.generateAsync({type: 'blob'}).then(blob => {
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'odak-writings.zip';
    document.body.appendChild(a);
    a.click();
    
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  });
}

function convertToMarkdown(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html;

  function processNode(node, context = {}) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();

      // Create new context for nested ordered lists
      if (tagName === 'ol') {
        context.olCounter = 1;
      }

      const childContent = Array.from(node.childNodes)
        .map(child => processNode(child, context))
        .join('');

      switch (tagName) {
        case 'h1': return `# ${childContent}`;
        case 'h2': return `## ${childContent}`;
        case 'h3': return `### ${childContent}`;
        case 'h4': return `#### ${childContent}`;
        case 'h5': return `##### ${childContent}`;
        case 'h6': return `###### ${childContent}`;
        case 'blockquote': return "\n" + `> ${childContent}` + "\n";
        case 'strong':
        case 'b': return `**${childContent}**`;
        case 'em':
        case 'i': return `*${childContent}*`;
        case 'u': return `__${childContent}__`;
        case 'code': return `\`${childContent}\``;
        case 'a':
          const href = node.getAttribute('href') || '';
          return `[${childContent}](${href})`;
        case 'img':
          const alt = node.getAttribute('alt') || '';
          const src = node.getAttribute('src') || '';
          return `![${alt}](${src})`;
        case 'hr': return `---` + "\n";
        case 'ul':
        case 'ol':
          return '\n' + childContent.trim() + '\n';
        case 'li':
          const parentList = node.parentElement?.tagName.toLowerCase();
          if (parentList === 'ol') {
            const number = context.olCounter || 1;
            context.olCounter = number + 1;
            return `${number}. ${childContent}\n`;
          } else {
            return `- ${childContent}\n`;
          }
        case 'div':
          const checkbox = node.querySelector('input[type="checkbox"]');
          if (checkbox) {
            const textContent = Array.from(node.childNodes)
              .filter(child => child.nodeType === Node.TEXT_NODE || 
                               (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() !== 'input'))
              .map(child => child.nodeType === Node.TEXT_NODE ? child.textContent : child.textContent)
              .join('')
              .trim();
            return `- [${checkbox.checked || checkbox.parentElement.getAttribute('data-checked') === 'true' ? 'x' : ' '}] ${textContent}`;
          }
          return childContent;
        case 'input':
          return '';
        case 'br':
          return '';
        case 'p':
          return childContent + '\n';
        default:
          return childContent;
      }
    }
    return '';
  }

  let markdown = '';
  const children = Array.from(temp.childNodes);

  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    const result = processNode(node);
    if (result.trim() || (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'hr')) {
      if (markdown && !markdown.endsWith('\n') && 
          node.nodeType === Node.ELEMENT_NODE &&
          ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'hr', 'div', 'p'].includes(node.tagName.toLowerCase())) {
        markdown += '\n';
      }
      markdown += result;

      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName.toLowerCase() === 'hr') {
          markdown += '\n\n';
        } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'li', 'div', 'p'].includes(node.tagName.toLowerCase())) {
          markdown += '\n';
        }
      }
    }
  }

  return markdown.replace(/\n{3,}/g, '\n\n').trim();
}


function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const content = e.target.result;
    
    
    const newId = 'doc_' + Date.now();
    const fileName = file.name.replace(/\.[^/.]+$/, "");
    
    
    let htmlContent = '';
    if (file.name.endsWith('.md')) {
      htmlContent = convertMarkdownToHtml(content);
    } else {
      
      htmlContent = `<p dir="auto">${content.replace(/\n/g, '</p><p dir="auto">')}</p>`;
    }
    
    
    documents[newId] = {
      id: newId,
      title: fileName,
      content: htmlContent,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    
    
    currentDocumentId = newId;
    saveDocumentsToStorage();
    loadDocument(newId);
    updateCounter();
  };
  
  reader.readAsText(file);  
  fileInput.value = '';
}

function convertMarkdownToHtml(markdown) {
  // Split the markdown into lines
  const lines = markdown.split('\n');
  let html = '';
  let inList = false;
  let listType = '';
  let listItems = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      if (inList) {
        html += `<${listType} dir="auto">${listItems.join('')}</${listType}>`;
        inList = false;
        listItems = [];
      }
      html += '<div dir="auto"></div>';
      continue;
    }

    // Headers
    if (line.startsWith('#')) {
      const level = line.match(/^#+/)[0].length;
      const content = line.replace(/^#+\s*/, '');
      html += `<h${level} dir="auto">${content}</h${level}>`;
      continue;
    }

    // Blockquotes
    if (line.startsWith('>')) {
      const content = line.replace(/^>\s*/, '');
      html += `<blockquote dir="auto">${content}</blockquote>`;
      continue;
    }

    // Horizontal Rule
    if (line === '---') {
      html += '<hr>';
      continue;
    }

    // Checkboxes
    if (/^-\s\[( |x)\]\s(.*)/.test(line)) {
      const match = line.match(/^-\s\[( |x)\]\s(.*)/);
      const checked = match[1] === 'x';
      const content = match[2];
      html += `<div dir="auto"><input type="checkbox" ${checked ? 'checked' : ''} dir="auto"> ${content}</div>`;
      continue;
    }
    
    // Ordered Lists
    if (line.match(/^\d+\.\s/)) {
      if (!inList || listType !== 'ol') {
        if (inList) {
          html += `<${listType} dir="auto">${listItems.join('')}</${listType}>`;
        }
        inList = true;
        listType = 'ol';
        listItems = [];
      }
      const content = line.replace(/^\d+\.\s*/, '');
      listItems.push(`<li dir="auto">${content}</li>`);
      continue;
    }

    // Unordered Lists
    if (line.startsWith('- ')) {
      if (!inList || listType !== 'ul') {
        if (inList) {
          html += `<${listType} dir="auto">${listItems.join('')}</${listType}>`;
        }
        inList = true;
        listType = 'ul';
        listItems = [];
      }
      const content = line.replace(/^-\s*/, '');
      listItems.push(`<li dir="auto">${content}</li>`);
      continue;
    }

    // Process inline markdown
    let processedLine = line
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
      // Underline
      .replace(/__(.+?)__/g, '<u>$1</u>')
      // Inline Code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

    html += `<div dir="auto">${processedLine}</div>`;
  }

  // Close any open list
  if (inList) {
    html += `<${listType} dir="auto">${listItems.join('')}</${listType}>`;
  }

  return html;
}

function updateCounter() {
  // Get all text nodes recursively from the editor
  const textNodes = [];
  const walk = document.createTreeWalker(
    editor,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let node;
  while (node = walk.nextNode()) {
    textNodes.push(node.textContent);
  }
  
  // Join all text nodes and normalize whitespace
  const text = textNodes.join(' ').replace(/\s+/g, ' ').trim();
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const wordCount = text === '' ? 0 : words.length;
  
  counter.textContent = `${wordCount} words`;
}

function handleShortcuts(e) {
  
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    saveCurrentDocument();
  }  
  if (e.ctrlKey && e.key === 'n') {
    e.preventDefault();
    createNewDocument();
  }
}

function initBootstrapTooltips() {
  
  if (typeof bootstrap === 'undefined') {
    console.warn('Bootstrap library not loaded, skipping tooltip initialization');
    return;
  }
  
  try {
    
    const elementsWithTitle = document.querySelectorAll('[title]');
    elementsWithTitle.forEach(el => {
      const title = el.getAttribute('title');
      if (title) {
        el.removeAttribute('title');
        el.setAttribute('data-bs-toggle', 'tooltip');
        el.setAttribute('data-bs-title', title);
      }
    });
    
    
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl, {
        trigger: 'hover'
      });
    });
  } catch (error) {
    console.error('Error initializing Bootstrap tooltips:', error);
  }
}

function updateFontSizeLabel() {
  const fontSizeLabel = document.getElementById('font-size-value');
  if (fontSize === 120) {
    fontSizeLabel.textContent = '120%';
  } else {
    fontSizeLabel.textContent = fontSize + '%';
  }
}

// Make popup draggable by header
function makePopupDraggable(popupId) {
  const popup = document.getElementById(popupId);
  if (!popup) return;
  const header = popup.querySelector('.popup-header');
  if (!header) return;
  let offsetX = 0, offsetY = 0, startX = 0, startY = 0, isDragging = false;

  header.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return; // Only left mouse button
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = popup.getBoundingClientRect();
    offsetX = startX - rect.left;
    offsetY = startY - rect.top;
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    let x = e.clientX - offsetX;
    let y = e.clientY - offsetY;
    // Keep popup within viewport
    x = Math.max(0, Math.min(window.innerWidth - popup.offsetWidth, x));
    y = Math.max(0, Math.min(window.innerHeight - popup.offsetHeight, y));
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    popup.style.transform = 'none';
  });

  document.addEventListener('mouseup', function() {
    isDragging = false;
    document.body.style.userSelect = '';
  });
}

function toggleToolbarAndStatusbar(mode = 'hide') {
  if (window.innerWidth <= 768) {
    if (mode == 'hide') {
      toolbar.style.opacity = 0;
      statusBar.style.opacity = 0;
    } else {
      toolbar.style.opacity = 1;
      statusBar.style.opacity = 1;
    }
  } else {
    if (mode == 'hide') {
      toolbar.style.opacity = 0;
      toolbar.style.left = '-100px';
      statusBar.style.opacity = 0;
      statusBar.style.bottom = '-100px';
    } else {
      toolbar.style.opacity = 1;
      toolbar.style.left = '5px';
      statusBar.style.opacity = 1;
      statusBar.style.bottom = '0';
    }
  }
}

function toggleInfo() {
  const infoPopup = document.getElementById('info-popup');
  infoPopup.classList.toggle('hidden');
}

function showInfoPopup() {
  const infoPopup = document.getElementById('info-popup');
  infoPopup.classList.remove('hidden');
}

function closeInfoPopup() {
  const infoPopup = document.getElementById('info-popup');
  infoPopup.classList.add('hidden');
}

function handleLetsGo() {
  localStorage.setItem('odak_has_seen_info', 'true');
  closeInfoPopup();
}

function syncCheckboxAttribute(e) {
  if (e.target.matches('input[type="checkbox"]')) {
    if (e.target.checked) {
      e.target.setAttribute('checked', '');
    } else {
      e.target.removeAttribute('checked');
    }
  }
}

document.addEventListener('change', syncCheckboxAttribute);
document.addEventListener('click', syncCheckboxAttribute);

document.addEventListener('DOMContentLoaded', () => {
  init();
  
  editor.addEventListener('input', () => {
    updateCounter();
    saveCurrentDocumentContent();
  });

  editor.addEventListener('click', () => {
    saveCurrentDocumentContent();
  });
  
  // Add event listener for keyboard shortcuts
  document.addEventListener('keydown', handleShortcuts);
  
  // Add event listeners for toolbar buttons
  document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);
  document.getElementById('list-btn').addEventListener('click', toggleDocumentsList);
  document.getElementById('sound-btn').addEventListener('click', toggleSound);
  document.getElementById('settings-btn').addEventListener('click', toggleSettings);
  document.getElementById('load-btn').addEventListener('click', () => fileInput.click());
  document.getElementById('download-btn').addEventListener('click', downloadCurrentDocument);
  
  // Add event listeners for status bar buttons
  document.getElementById('new-btn').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    createNewDocument();
  });
  document.getElementById('save-btn').addEventListener('click', saveCurrentDocument);
  
  // Add event listeners for popup close buttons
  document.getElementById('close-list').addEventListener('click', () => listPopup.classList.add('hidden'));
  document.getElementById('close-settings').addEventListener('click', () => settingsPopup.classList.add('hidden'));
  
  // Add event listeners for file inputs
  fileInput.addEventListener('change', handleFileUpload);
  document.getElementById('bg-file-input').addEventListener('change', handleBackgroundUpload);
  
  // Add event listeners for settings controls
  document.getElementById('font-family-select').addEventListener('change', (e) => {
    fontFamily = e.target.value;
    localStorage.setItem('odak_font_family', fontFamily);
    applySettings();
  });
  
  document.getElementById('font-size-slider').addEventListener('input', (e) => {
    fontSize = parseInt(e.target.value);
    localStorage.setItem('odak_font_size', fontSize);
    updateFontSizeLabel();
    applySettings();
  });
  
  document.getElementById('editor-width-input').addEventListener('change', (e) => {
    editorWidth = parseInt(e.target.value);
    localStorage.setItem('odak_editor_width', editorWidth);
    applySettings();
  });
  
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setTheme(btn.dataset.theme);
    });
  });
  
  document.getElementById('volume-slider').addEventListener('input', (e) => {
    soundVolume = parseInt(e.target.value) / 100;
    document.getElementById('volume-value').textContent = e.target.value + '%';
    updateSoundButton();
    localStorage.setItem('odak_sound_volume', soundVolume);
  });
  
  document.getElementById('upload-bg-btn').addEventListener('click', () => {
    document.getElementById('bg-file-input').click();
  });
  
  document.getElementById('default-bg').addEventListener('click', () => {
    useCustomBg = false;
    localStorage.setItem('odak_use_custom_bg', 'false');
    updateBackgroundSelection();
    applyBackground();
  });
  
  document.getElementById('custom-bg').addEventListener('click', () => {
    if (customBackground) {
      useCustomBg = true;
      localStorage.setItem('odak_use_custom_bg', 'true');
      updateBackgroundSelection();
      applyBackground();
    }
  });

  document.getElementById('download-all-btn').addEventListener('click', downloadAllDocuments);

  document.addEventListener('click', (e) => {
    const volumePopup = document.getElementById('volume-popup');
    const soundBtn = document.getElementById('sound-btn');
    if (!volumePopup.contains(e.target) && !soundBtn.contains(e.target)) {
      volumePopup.classList.add('hidden');
    }
  });

  makePopupDraggable('settings-popup');
  makePopupDraggable('list-popup');
  makePopupDraggable('info-popup');

  // Add event listeners for info popup
  const infoBtn = document.getElementById('info-btn');
  const closeInfoBtn = document.getElementById('close-info');
  const letsGoBtn = document.getElementById('lets-go-btn');

  infoBtn.addEventListener('click', toggleInfo);
  closeInfoBtn.addEventListener('click', closeInfoPopup);
  letsGoBtn.addEventListener('click', handleLetsGo);




});
