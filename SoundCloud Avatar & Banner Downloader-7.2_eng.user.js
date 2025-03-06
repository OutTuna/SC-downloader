// ==UserScript==
// @name         SoundCloud Avatar & Banner Downloader
// @namespace    http://tampermonkey.net/
// @version      7._rus
// @description  Add a button to download SoundCloud avatars, banners, and covers
// @author       fellfromheaven
// @match        https://soundcloud.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

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
                if (match && match[2]) {
                    return match[2].replace(/-t\d+x\d+/, '-t500x500');
                }
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
            if (match && match[2]) {
                return match[2].replace(/-t\d+x\d+/, '-t2480x520');
            }
        }
        console.log('Banner not found');
        return null;
    }

    function getCoverUrl(coverElement) {
        if (coverElement && coverElement.classList.contains('image__full')) {
            const style = coverElement.getAttribute('style');
            if (style) {
                const match = style.match(/background-image: url\((['"]?)(.*?)\1\)/);
                if (match && match[2]) {
                    return match[2].replace(/-t\d+x\d+/, '-t500x500');
                }
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

        menu.appendChild(createButton('📂 Download Add', async () => {
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

    function addDownloadButton() {
        const profileHeader = document.querySelector('.profileHeaderInfo__content');
        if (!profileHeader || document.getElementById('sc-download-btn')) return;

        const button = document.createElement('button');
        button.innerText = '⬇️ Download';
        button.id = 'sc-download-btn';
        button.style.cssText = 'margin-top: 10px; padding: 5px 10px; cursor: pointer; position: relative; z-index: 10001;';

        const menu = createMenu(button);
        profileHeader.appendChild(button);
    }

    function init() {
        addDownloadButton();
        addCoverDownloadButtons();
        const observer = new MutationObserver(() => {
            addDownloadButton();
            addCoverDownloadButtons();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    window.addEventListener('load', init);
})();