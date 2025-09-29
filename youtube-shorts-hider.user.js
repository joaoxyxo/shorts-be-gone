// ==UserScript==
// @name         YouTube Shorts Hider
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Oculta automaticamente a seção de YouTube Shorts para uma experiência mais limpa e focada
// @author       You
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'yt-shorts-hider-enabled';
    let isEnabled = (GM_getValue(STORAGE_KEY, 'true') === 'true');
    let debounceTimer = null;
    let styleElements = [];

    const injectCSS = () => {
        if (!isEnabled || styleElements.length > 0) return;

        const rules = [
            'ytd-reel-shelf-renderer { display: none !important; }',
            'ytd-rich-shelf-renderer[is-shorts] { display: none !important; }',
            'ytd-reel-item-renderer { display: none !important; }',
            '[is-reel] { display: none !important; }',
            'a[href="/shorts"] { display: none !important; }',
            'a[href^="/shorts/"] { display: none !important; }',
            'a[href^="/shorts?"] { display: none !important; }',
            'a[href*="youtube.com/shorts"] { display: none !important; }',
            'ytd-guide-entry-renderer a[href="/shorts"] { display: none !important; }',
            'ytd-mini-guide-entry-renderer a[href="/shorts"] { display: none !important; }',
            'ytd-guide-entry-renderer:has(a[href^="/shorts"]) { display: none !important; }',
            'ytd-mini-guide-entry-renderer:has(a[href^="/shorts"]) { display: none !important; }',
            'tp-yt-paper-item:has(a[href^="/shorts"]) { display: none !important; }'
        ];

        rules.forEach(rule => {
            try {
                const style = GM_addStyle(rule);
                if (style) styleElements.push(style);
            } catch (e) {
                console.debug('Erro ao injetar CSS:', e);
            }
        });
    };

    const removeCSS = () => {
        styleElements.forEach(style => {
            try {
                style.remove();
            } catch (e) {
                console.debug('Erro ao remover CSS:', e);
            }
        });
        styleElements = [];
    };

    const hideShorts = () => {
        if (!isEnabled) return;

        const selectors = [
            'ytd-reel-shelf-renderer',
            'ytd-rich-shelf-renderer[is-shorts]',
            'ytd-reel-item-renderer',
            '[is-reel]',
            'a[href="/shorts"]',
            'a[href^="/shorts/"]',
            'a[href^="/shorts?"]',
            'a[href*="youtube.com/shorts"]'
        ];

        selectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el && !el.hasAttribute('data-shorts-hidden')) {
                        let target = el;
                        
                        if (el.tagName === 'A') {
                            target = el.closest('ytd-guide-entry-renderer') ||
                                   el.closest('ytd-mini-guide-entry-renderer') ||
                                   el.closest('ytd-reel-shelf-renderer') ||
                                   el.closest('ytd-rich-section-renderer') ||
                                   el.closest('ytd-rich-item-renderer') || 
                                   el.closest('ytd-grid-video-renderer') || 
                                   el.closest('ytd-video-renderer') || 
                                   el.closest('ytd-compact-video-renderer') ||
                                   el.closest('ytd-thumbnail') ||
                                   el.closest('tp-yt-paper-item') ||
                                   el;
                        }
                        
                        target.style.display = 'none';
                        target.setAttribute('data-shorts-hidden', 'true');
                    }
                });
            } catch (e) {
                console.debug('Erro com seletor:', selector, e);
            }
        });

        try {
            const richSections = document.querySelectorAll('ytd-rich-section-renderer');
            richSections.forEach(section => {
                const header = section.querySelector('#rich-shelf-header');
                if (header) {
                    const titleElement = header.querySelector('#title, span, h2, h3');
                    if (titleElement && titleElement.textContent.toLowerCase().includes('shorts')) {
                        if (!section.hasAttribute('data-shorts-hidden')) {
                            section.style.display = 'none';
                            section.setAttribute('data-shorts-hidden', 'true');
                        }
                    }
                }
            });
        } catch (e) {
            console.debug('Erro ao processar rich sections:', e);
        }

        try {
            const guideEntries = document.querySelectorAll('ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer');
            guideEntries.forEach(entry => {
                const link = entry.querySelector('a');
                if (link) {
                    const href = link.getAttribute('href') || '';
                    const title = (link.getAttribute('title') || '').toLowerCase();
                    const text = (link.textContent || '').trim().toLowerCase();
                    const ariaLabel = (link.getAttribute('aria-label') || '').toLowerCase();
                    
                    if (href.startsWith('/shorts') || 
                        title === 'shorts' || 
                        text === 'shorts' ||
                        ariaLabel.includes('shorts')) {
                        entry.style.display = 'none';
                        entry.setAttribute('data-shorts-hidden', 'true');
                    }
                }
            });
        } catch (e) {
            console.debug('Erro ao processar guide entries:', e);
        }

        try {
            const sidebarItems = document.querySelectorAll('tp-yt-paper-item');
            sidebarItems.forEach(item => {
                const link = item.querySelector('a');
                if (link) {
                    const href = link.getAttribute('href') || '';
                    const text = (link.textContent || '').trim().toLowerCase();
                    
                    if (href.startsWith('/shorts') || text === 'shorts') {
                        item.style.display = 'none';
                        item.setAttribute('data-shorts-hidden', 'true');
                    }
                }
            });
        } catch (e) {
            console.debug('Erro ao processar paper items:', e);
        }

        try {
            const richItems = document.querySelectorAll('ytd-rich-item-renderer');
            richItems.forEach(item => {
                const reelRenderer = item.querySelector('ytd-reel-item-renderer');
                if (reelRenderer && !item.hasAttribute('data-shorts-hidden')) {
                    item.style.display = 'none';
                    item.setAttribute('data-shorts-hidden', 'true');
                }
            });
        } catch (e) {
            console.debug('Erro ao processar rich items:', e);
        }
    };

    const showShorts = () => {
        const hiddenElements = document.querySelectorAll('[data-shorts-hidden]');
        hiddenElements.forEach(el => {
            el.style.display = '';
            el.removeAttribute('data-shorts-hidden');
        });
    };

    const debouncedHideShorts = () => {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
            hideShorts();
        }, 100);
    };

    const createToggleButton = () => {
        if (document.getElementById('yt-shorts-toggle-container')) return;

        const container = document.createElement('div');
        container.id = 'yt-shorts-toggle-container';
        container.innerHTML = `
            <div id="yt-shorts-toggle-panel">
                <div class="toggle-header">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M10 14.65v-5.3L15 12l-5 2.65zm7.77-4.33c-.77-.32-1.2-.5-1.2-.5L18 9.06c1.84-.96 2.53-3.23 1.56-5.06s-3.24-2.53-5.07-1.56L6 6.94c-1.29.68-2.07 2.04-2 3.49.07 1.42.93 2.67 2.22 3.25.03.01 1.2.5 1.2.5L6 14.93c-1.83.97-2.53 3.24-1.56 5.07.97 1.83 3.24 2.53 5.07 1.56l8.5-4.5c1.29-.68 2.06-2.04 1.99-3.49-.07-1.42-.94-2.68-2.23-3.25zM10 14.65v-5.3L15 12l-5 2.65z"/>
                    </svg>
                    <span>YouTube Shorts Hider</span>
                </div>
                <div class="toggle-content">
                    <label class="toggle-switch">
                        <input type="checkbox" id="yt-shorts-toggle" ${isEnabled ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                    <span class="toggle-label">${isEnabled ? 'Ativado' : 'Desativado'}</span>
                </div>
            </div>
        `;

        document.body.appendChild(container);

        const toggle = document.getElementById('yt-shorts-toggle');
        const label = container.querySelector('.toggle-label');

        toggle.addEventListener('change', (e) => {
            isEnabled = e.target.checked;
            GM_setValue(STORAGE_KEY, isEnabled.toString());
            label.textContent = isEnabled ? 'Ativado' : 'Desativado';

            if (isEnabled) {
                injectCSS();
                hideShorts();
            } else {
                removeCSS();
                showShorts();
            }
        });

        container.addEventListener('click', (e) => {
            if (e.target === container) {
                container.classList.toggle('minimized');
            }
        });
    };

    GM_addStyle(`
        #yt-shorts-toggle-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            font-family: 'Roboto', 'YouTube Sans', Arial, sans-serif;
        }

        #yt-shorts-toggle-panel {
            background: #FFFFFF;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            padding: 16px;
            min-width: 260px;
            transition: all 0.3s ease;
        }

        .toggle-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
            color: #030303;
            font-weight: 500;
            font-size: 14px;
        }

        .toggle-header svg {
            color: #FF0000;
        }

        .toggle-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }

        .toggle-label {
            color: #030303;
            font-size: 13px;
            font-weight: 400;
        }

        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;
        }

        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: 0.3s;
            border-radius: 24px;
        }

        .toggle-slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: 0.3s;
            border-radius: 50%;
        }

        .toggle-switch input:checked + .toggle-slider {
            background-color: #065FD4;
        }

        .toggle-switch input:checked + .toggle-slider:before {
            transform: translateX(20px);
        }

        #yt-shorts-toggle-container.minimized #yt-shorts-toggle-panel {
            transform: scale(0.8);
            opacity: 0.6;
        }

        #yt-shorts-toggle-container.minimized:hover #yt-shorts-toggle-panel {
            transform: scale(1);
            opacity: 1;
        }

        @media (prefers-color-scheme: dark) {
            #yt-shorts-toggle-panel {
                background: #282828;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
            }

            .toggle-header,
            .toggle-label {
                color: #FFFFFF;
            }
        }
    `);

    const observer = new MutationObserver(() => {
        if (isEnabled) {
            debouncedHideShorts();
        }
    });

    const init = () => {
        hideShorts();
        
        if (document.body) {
            createToggleButton();
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    };

    injectCSS();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.addEventListener('yt-navigate-start', () => {
        if (isEnabled) {
            hideShorts();
        }
    });
    
    window.addEventListener('yt-navigate-finish', () => {
        if (isEnabled) {
            setTimeout(() => hideShorts(), 100);
            setTimeout(() => hideShorts(), 500);
        }
    });
    
    window.addEventListener('load', () => {
        if (isEnabled) {
            hideShorts();
        }
    });

})();
