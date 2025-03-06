// ==UserScript==
// @name         SoundCloud Ultimate Downloader
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Download SoundCloud avatars, banners, covers, and tracks
// @author       fellfromheaven & maple3142 (thx for downloader)
// @match        https://soundcloud.com/*
// @require      https://cdn.jsdelivr.net/npm/web-streams-polyfill@2.0.2/dist/ponyfill.min.js
// @require      https://cdn.jsdelivr.net/npm/streamsaver@2.0.3/StreamSaver.min.js
// @grant        none
// @icon         https://a-v2.sndcdn.com/assets/images/sc-icons/favicon-2cadd14bdb.ico
// ==/UserScript==

(function() {
    'use strict';

    streamSaver.mitm = 'https://maple3142.github.io/StreamSaver.js/mitm.html';

    // --- Функции для скачивания изображений (из первого скрипта) ---
    async function downloadImage(url, filename) {
        try {
            console.log('Downloading:', url);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Ошибка при загрузке изображения:', error);
        }
    }

    function getAvatarUrl() {
        const profileAvatarElement = document.querySelector('.profileHeaderInfo__avatar span.sc-artwork');
        if (profileAvatarElement) {
            const style = profileAvatarElement.getAttribute('style');
            if (style) {
                const match = style.match(/background-image: url\((['"]?)(.*?)\1\)/);
                if (match && match[2]) return match[2].replace(/-t\d+x\d+/, '-t500x500');
            }
        }
        console.log('Avatar not found');
        return null;
    }

    function getBannerUrl() {
        const bannerElement = document.querySelector('.profileHeaderBackground__visual');
        if (bannerElement) {
            const style = window.getComputedStyle(bannerElement).backgroundImage;
            const match = style.match(/url\((['"]?)(.*?)\1\)/);
            if (match && match[2]) return match[2].replace(/-t\d+x\d+/, '-t2480x520');
        }
        console.log('Banner not found');
        return null;
    }

    function getCoverUrl(coverElement) {
        if (coverElement && coverElement.classList.contains('image__full')) {
            const style = coverElement.getAttribute('style');
            if (style) {
                const match = style.match(/background-image: url\((['"]?)(.*?)\1\)/);
                if (match && match[2]) return match[2].replace(/-t\d+x\d+/, '-t500x500');
            }
        }
        console.log('Cover not found');
        return null;
    }

    function addCoverDownloadButtons() {
        document.querySelectorAll('.sc-artwork.image__full').forEach((coverElement) => {
            if (!coverElement.closest('.sound__coverArt')) return;
            if (coverElement.querySelector('.sc-cover-download-btn')) return;

            const button = document.createElement('button');
            button.innerText = '⬇️';
            button.className = 'sc-cover-download-btn';
            button.style.cssText = 'position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.5); color: white; border: none; padding: 5px 10px; cursor: pointer; font-size: 16px; z-index: 1001;';
            button.addEventListener('click', async (event) => {
                event.stopPropagation();
                const coverUrl = getCoverUrl(coverElement);
                if (coverUrl) await downloadImage(coverUrl, 'cover.jpg');
            });

            coverElement.style.position = 'relative';
            coverElement.appendChild(button);
        });
    }

    function createMenu(button) {
        const menu = document.createElement('div');
        menu.id = 'sc-download-menu';
        menu.style.cssText = 'position: absolute; background: white; border: 2px solid red; padding: 10px; display: none; flex-direction: column; box-shadow: 2px 2px 10px rgba(0,0,0,0.2); z-index: 99999; width: 200px;';

        function createButton(text, action) {
            const btn = document.createElement('button');
            btn.innerText = text;
            btn.style.cssText = 'margin: 5px; cursor: pointer; padding: 5px; width: 100%;';
            btn.addEventListener('click', async (event) => {
                event.stopPropagation();
                await action();
                menu.style.display = 'none';
            });
            return btn;
        }

        menu.appendChild(createButton('📷 Download Avatar', async () => {
            const avatarUrl = getAvatarUrl();
            if (avatarUrl) await downloadImage(avatarUrl, 'avatar.jpg');
        }));

        menu.appendChild(createButton('🖼️ Download Banner', async () => {
            const bannerUrl = getBannerUrl();
            if (bannerUrl) await downloadImage(bannerUrl, 'banner.jpg');
        }));

        menu.appendChild(createButton('📂 Download All', async () => {
            const avatarUrl = getAvatarUrl();
            const bannerUrl = getBannerUrl();
            if (avatarUrl) await downloadImage(avatarUrl, 'avatar.jpg');
            if (bannerUrl) await downloadImage(bannerUrl, 'banner.jpg');
        }));

        document.body.appendChild(menu);

        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const rect = button.getBoundingClientRect();
            menu.style.display = 'flex';
            menu.style.top = `${rect.bottom + window.scrollY}px`;
            menu.style.left = `${rect.left + window.scrollX}px`;
        });

        document.addEventListener('click', (event) => {
            if (!menu.contains(event.target) && event.target !== button) {
                menu.style.display = 'none';
            }
        });

        return menu;
    }

    function addImageDownloadButton() {
        const profileHeader = document.querySelector('.profileHeaderInfo__content');
        if (!profileHeader || document.getElementById('sc-image-download-btn')) return;

        const button = document.createElement('button');
        button.innerText = '⬇️ Download';
        button.id = 'sc-image-download-btn';
        button.style.cssText = 'margin-top: 10px; padding: 5px 10px; cursor: pointer; position: relative; z-index: 10001;';
        createMenu(button);
        profileHeader.appendChild(button);
    }

    // --- Функции для скачивания аудио (из второго скрипта) ---
    function hook(obj, name, callback, type) {
        const fn = obj[name];
        obj[name] = function (...args) {
            if (type === 'before') callback.apply(this, args);
            fn.apply(this, args);
            if (type === 'after') callback.apply(this, args);
        };
        return () => { obj[name] = fn; };
    }

    const audioBtn = {
        init() {
            this.el = document.createElement('button');
            this.el.textContent = 'Download Track';
            this.el.classList.add('sc-button', 'sc-button-medium', 'sc-button-responsive', 'sc-button-download');
        },
        cb() {
            const par = document.querySelector('.sc-button-toolbar .sc-button-group');
            if (par && this.el.parentElement !== par) par.insertAdjacentElement('beforeend', this.el);
        },
        attach() {
            this.detach();
            this.observer = new MutationObserver(this.cb.bind(this));
            this.observer.observe(document.body, { childList: true, subtree: true });
            this.cb();
        },
        detach() {
            if (this.observer) this.observer.disconnect();
        }
    };
    audioBtn.init();

    async function getClientId() {
        return new Promise(resolve => {
            const restore = hook(
                XMLHttpRequest.prototype,
                'open',
                async (method, url) => {
                    const u = new URL(url, document.baseURI);
                    const clientId = u.searchParams.get('client_id');
                    if (clientId) {
                        console.log('got clientId', clientId);
                        restore();
                        resolve(clientId);
                    }
                },
                'after'
            );
        });
    }

    const clientIdPromise = getClientId();
    let controller = null;

    async function loadAudioButton(by) {
        audioBtn.detach();
        if (/^(\/(you|stations|discover|stream|upload|search|settings))/.test(location.pathname)) return;

        const clientId = await clientIdPromise;
        if (controller) {
            controller.abort();
            controller = null;
        }
        controller = new AbortController();

        const result = await fetch(
            `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(location.href)}&client_id=${clientId}`,
            { signal: controller.signal }
        ).then(r => r.json());

        if (result.kind !== 'track') return;

        audioBtn.el.onclick = async () => {
            const progressive = result.media.transcodings.find(t => t.format.protocol === 'progressive');
            if (progressive) {
                const { url } = await fetch(progressive.url + `?client_id=${clientId}`).then(r => r.json());
                const resp = await fetch(url);
                const ws = streamSaver.createWriteStream(result.title + '.mp3', {
                    size: resp.headers.get('Content-Length')
                });
                const rs = resp.body;
                if (rs.pipeTo) return rs.pipeTo(ws);
                const reader = rs.getReader();
                const writer = ws.getWriter();
                const pump = () => reader.read().then(res => (res.done ? writer.close() : writer.write(res.value).then(pump)));
                return pump();
            }
            alert('Sorry, downloading this music is currently unsupported.');
        };
        audioBtn.attach();
    }

    // --- Инициализация ---
    function init() {
        // Инициализация кнопок для изображений
        addImageDownloadButton();
        addCoverDownloadButtons();
        const imageObserver = new MutationObserver(() => {
            addImageDownloadButton();
            addCoverDownloadButtons();
        });
        imageObserver.observe(document.body, { childList: true, subtree: true });

        // Инициализация кнопки для аудио
        loadAudioButton('init');
        hook(history, 'pushState', () => loadAudioButton('pushState'), 'after');
        window.addEventListener('popstate', () => loadAudioButton('popstate'));
    }

    window.addEventListener('load', init);
})();