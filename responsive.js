function createMobileBottomBar() {
    const bottomBar = document.createElement('div');
    bottomBar.className = 'mobile-bottom-bar';
    bottomBar.style.display = 'none'; // Hidden by default, shown only on mobile

    bottomBar.innerHTML = `
    <div class="bottom-bar-left">
    <button class="mobile-btn" id="mobile-list-btn" title="Your Writings">
    <i class="fas fa-list"></i>
    </button>
    <button class="mobile-btn" id="mobile-settings-btn" title="Settings">
    <i class="fas fa-cog"></i>
    </button>
    </div>

    <div class="bottom-bar-center">
    <button class="mobile-btn" id="mobile-load-btn" title="Load File">
    <i class="fas fa-file-upload"></i>
    </button>
    <button class="mobile-btn" id="mobile-fullscreen-btn" title="Fullscreen">
    <i class="fas fa-expand"></i>
    </button>
    <button class="mobile-btn" id="mobile-sound-btn" title="Volume">
    <i class="fas fa-volume-up"></i>
    </button>
    <button class="mobile-btn" id="mobile-download-btn" title="Download">
    <i class="fas fa-download"></i>
    </button>
    <button class="mobile-btn" id="mobile-info-btn" title="Info">
    <i class="fas fa-info-circle"></i>
    </button>
    </div>

    <div class="bottom-bar-right">
    <button class="mobile-btn primary" id="mobile-new-btn">New</button>
    <button class="mobile-btn primary" id="mobile-save-btn">Save</button>
    </div>
    `;

    document.body.appendChild(bottomBar);

    // Map mobile buttons to desktop functionality
    const buttonMappings = {
        'mobile-list-btn': 'list-btn',
        'mobile-settings-btn': 'settings-btn',
        'mobile-load-btn': 'load-btn',
        'mobile-fullscreen-btn': 'fullscreen-btn',
        'mobile-sound-btn': 'sound-btn',
        'mobile-download-btn': 'download-btn',
        'mobile-info-btn': 'info-btn',
        'mobile-new-btn': 'new-btn',
        'mobile-save-btn': 'save-btn'
    };

    // Add event listeners to mobile buttons
    Object.entries(buttonMappings).forEach(([mobileId, desktopId]) => {
        const mobileBtn = document.getElementById(mobileId);
        const desktopBtn = document.getElementById(desktopId);

        if (mobileBtn && desktopBtn) {
            mobileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                desktopBtn.click();
            });
        }
    });

    // Show/hide mobile bar based on screen size
    function toggleMobileBar() {
        if (window.innerWidth <= 945) {
            bottomBar.style.display = 'flex';
        } else {
            bottomBar.style.display = 'none';
        }
    }

    // Update mobile counter (sync with desktop counter)
    function updateMobileCounter() {
        const desktopCounter = document.getElementById('counter');
        const mobileCounter = document.getElementById('mobile-counter');

        if (desktopCounter && mobileCounter) {
            mobileCounter.textContent = desktopCounter.textContent;
        }
    }

    // Initialize on load and resize
    toggleMobileBar();
    window.addEventListener('resize', toggleMobileBar);

    // Observe changes to desktop counter
    const observer = new MutationObserver(updateMobileCounter);
    const desktopCounter = document.getElementById('counter');
    if (desktopCounter) {
        observer.observe(desktopCounter, { childList: true, subtree: true });
    }

    // Update counter periodically
    setInterval(updateMobileCounter, 1000);
}

// Initialize mobile bottom bar when DOM is loaded
document.addEventListener('DOMContentLoaded', createMobileBottomBar);
