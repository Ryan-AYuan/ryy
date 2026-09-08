// Gallery & Project Rendering Logic

// Function to render Projects
window.renderProjects = () => {
    const container = document.querySelector('#projects .projects-grid');
    if (!container || !siteData.projects) return;

    container.innerHTML = siteData.projects.map(p => `
        <a href="${p.link}" class="project-card" target="_blank">
            <div class="project-content">
                <div class="project-title">${p.title}</div>
                <div class="project-date">${p.date}</div>
                <div class="project-desc">${p.desc}</div>
            </div>
        </a>
    `).join('');
};

// Function to render Gallery
window.renderGallery = () => {
    const container = document.getElementById('gallery');
    if (!container || !siteData.photos) return;
    
    // Keep the title
    const title = container.querySelector('h2');
    container.innerHTML = '';
    if (title) container.appendChild(title);

    const albums = Object.keys(typeof PHOTO_ALBUMS !== 'undefined' ? PHOTO_ALBUMS : {})
        .sort((a, b) => PHOTO_ALBUMS[a].order - PHOTO_ALBUMS[b].order)
        .filter(id => Array.isArray(siteData.photos[id]) && siteData.photos[id].length > 0);

    albums.forEach(albumId => {
        const album = PHOTO_ALBUMS[albumId];
        const albumSection = document.createElement('div');
        albumSection.className = 'year-section';

        const albumTitle = document.createElement('h3');
        albumTitle.className = 'year-title';
        const photos = siteData.photos[albumId];
        const nameEl = document.createElement('span');
        nameEl.className = 'album-name';
        nameEl.textContent = album.title;
        const countEl = document.createElement('span');
        countEl.className = 'album-count';
        countEl.textContent = String(photos.length);
        albumTitle.appendChild(nameEl);
        albumTitle.appendChild(countEl);

        const albumContent = document.createElement('div');
        albumContent.className = 'year-content';

        const galleryGrid = document.createElement('div');
        galleryGrid.className = 'gallery-grid';

        photos.forEach((photo, index) => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.dataset.albumId = albumId;
            item.dataset.index = String(index);

            const img = document.createElement('img');
            img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            img.dataset.src = photo.src;
            img.dataset.blobUrl = photo.blobUrl || '';
            img.alt = photo.caption;
            img.className = 'gallery-img';

            item.appendChild(img);
            galleryGrid.appendChild(item);
        });

        albumContent.appendChild(galleryGrid);
        albumSection.appendChild(albumTitle);
        albumSection.appendChild(albumContent);
        container.appendChild(albumSection);
    });
};

// 1. Setup Animation Observer
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            
            // Handle lazy loading for private repo images
            const img = entry.target.querySelector('img.gallery-img');
            if (img && img.dataset.src) {
                // Calls global helper from app.js
                if (window.loadAuthenticatedImage) {
                    window.loadAuthenticatedImage(img, img.dataset.src, img.dataset.blobUrl);
                } else {
                    img.src = img.dataset.src;
                }
                img.removeAttribute('data-src'); // Prevent re-fetch
            }

            observer.unobserve(entry.target);
        }
    });
});

window.observeElements = () => {
    document.querySelectorAll('.project-card, .gallery-item').forEach(el => {
        el.classList.add('fade-in-up');
        observer.observe(el);
    });
};

// 3. Setup Collapsible Logic
const toggleSection = (title, contentClass) => {
    const section = title.parentElement;
    const content = section.querySelector(contentClass);
    
    section.classList.toggle('active');
    
    if (section.classList.contains('active')) {
        content.style.maxHeight = content.scrollHeight + "px";
        content.style.opacity = 1;
    } else {
        content.style.maxHeight = null;
        content.style.opacity = 0;
    }
};

// Initialize all active sections (Year & Month)
const initSections = () => {
    // First init months (inner) so they have height
    document.querySelectorAll('.month-section.active').forEach(section => {
        const content = section.querySelector('.month-content');
        if (content) {
            content.style.maxHeight = content.scrollHeight + "px";
            content.style.opacity = 1;
        }
    });
    
    // Then init years (outer) - need to account for inner content
    document.querySelectorAll('.year-section.active').forEach(section => {
        const content = section.querySelector('.year-content');
        if (content) {
            content.style.maxHeight = "none"; 
            const height = content.scrollHeight;
            content.style.maxHeight = height + "px";
            content.style.opacity = 1;
        }
    });
};

// Event Delegation for Collapsibles (Handles dynamic content)
document.addEventListener('click', (e) => {
    const yearTitle = e.target.closest('.year-title');
    if (yearTitle) {
        toggleSection(yearTitle, '.year-content');
        return;
    }

    const monthTitle = e.target.closest('.month-title');
    if (monthTitle) {
        toggleSection(monthTitle, '.month-content');
        
        // If a month is toggled, we need to update the parent Year's height
        const parentYearContent = monthTitle.closest('.year-content');
        if (parentYearContent) {
            parentYearContent.style.maxHeight = "none"; // Release constraint
            setTimeout(() => {
                    parentYearContent.style.maxHeight = parentYearContent.scrollHeight + "px";
            }, 350); // Wait for month transition
        }
        return;
    }
});

// Initial setup
setTimeout(initSections, 100);

// Handle Resize
window.addEventListener('resize', () => {
        document.querySelectorAll('.active > .year-content, .active > .month-content').forEach(el => {
            el.style.maxHeight = "none";
        });
        setTimeout(initSections, 50);
});

// 6. Lightbox Logic
const initLightbox = () => {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const closeBtn = document.querySelector('.lightbox-close');
    const prevBtn = document.querySelector('.lightbox-prev');
    const nextBtn = document.querySelector('.lightbox-next');

    if (!lightbox || !lightboxImg) return;

    // State
    let scale = 1;
    let pointX = 0;
    let pointY = 0;
    let startPointX = 0;
    let startPointY = 0;
    let isDragging = false;
    
    // Navigation State
    let galleryImages = [];
    let currentIndex = 0;

    const setTransform = () => {
        lightboxImg.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
    };

    const resetZoom = () => {
        scale = 1;
        pointX = 0;
        pointY = 0;
        lightboxImg.style.transform = 'none';
        lightboxImg.style.cursor = 'zoom-in';
    };

    const updateImage = (index) => {
        if (index < 0) index = galleryImages.length - 1;
        if (index >= galleryImages.length) index = 0;
        
        currentIndex = index;
        const img = galleryImages[currentIndex];

        lightboxImg.style.opacity = 0.5;
        
        setTimeout(() => {
            lightboxImg.src = img.src && !img.src.startsWith('data:') ? img.src : (img.dataset.src || img.src);
            lightboxImg.alt = img.alt;
            lightboxCaption.textContent = img.alt || '';
            lightboxImg.style.opacity = 1;
            resetZoom();
        }, 150);
    };

    // Open Lightbox
    document.addEventListener('click', (e) => {
        const galleryItem = e.target.closest('.gallery-item');
        if (galleryItem) {
            const img = galleryItem.querySelector('img');
            
            if (img) {
                const grid = galleryItem.closest('.gallery-grid');
                galleryImages = Array.from((grid || document).querySelectorAll('.gallery-img'));
                currentIndex = galleryImages.indexOf(img);

                updateImage(currentIndex);
                lightbox.classList.add('active');
            }
        }
    });

    // Navigation Handlers
    const showNext = (e) => {
        if (e) e.stopPropagation();
        updateImage(currentIndex + 1);
    };

    const showPrev = (e) => {
        if (e) e.stopPropagation();
        updateImage(currentIndex - 1);
    };

    nextBtn.addEventListener('click', showNext);
    prevBtn.addEventListener('click', showPrev);

    let touchStartX = 0;
    let didSwipe = false;
    lightbox.addEventListener('touchstart', (e) => {
        if (scale > 1) return;
        didSwipe = false;
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    lightbox.addEventListener('touchend', (e) => {
        if (scale > 1) return;
        const dx = e.changedTouches[0].screenX - touchStartX;
        if (Math.abs(dx) < 50) return;
        didSwipe = true;
        if (dx < 0) showNext();
        else showPrev();
    }, { passive: true });

    // Close Lightbox
    const closeLightbox = () => {
        lightbox.classList.remove('active');
        setTimeout(() => {
            lightboxImg.src = ''; 
            resetZoom();
        }, 300);
    };

    closeBtn.addEventListener('click', closeLightbox);
    
    // Close on clicking outside image (but not on nav buttons)
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // Keyboard Support
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;

        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') showNext();
        if (e.key === 'ArrowLeft') showPrev();
    });

    // Zoom Logic: Click to Toggle
    lightboxImg.addEventListener('click', (e) => {
        e.stopPropagation();
        if (didSwipe) {
            didSwipe = false;
            return;
        }
        if (scale === 1) {
            scale = 2.5;
            lightboxImg.style.cursor = 'grab';
        } else {
            scale = 1;
            pointX = 0; 
            pointY = 0;
            lightboxImg.style.cursor = 'zoom-in';
        }
        setTransform();
    });

    // Zoom Logic: Wheel
    lightboxImg.addEventListener('wheel', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const delta = -Math.sign(e.deltaY) * 0.5;
        const newScale = Math.min(Math.max(1, scale + delta), 5); 
        
        if (newScale !== scale) {
            scale = newScale;
            if (scale > 1) {
                lightboxImg.style.cursor = 'grab';
            } else {
                lightboxImg.style.cursor = 'zoom-in';
                pointX = 0;
                pointY = 0;
            }
            setTransform();
        }
    });

    // Pan Logic
    lightboxImg.addEventListener('mousedown', (e) => {
        if (scale <= 1) return;
        e.preventDefault(); 
        isDragging = true;
        startPointX = e.clientX - pointX;
        startPointY = e.clientY - pointY;
        lightboxImg.classList.add('grabbing');
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        pointX = e.clientX - startPointX;
        pointY = e.clientY - startPointY;
        setTransform();
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            lightboxImg.classList.remove('grabbing');
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    initLightbox();
});

// Handle Data Loading for Gallery components
document.addEventListener('SiteDataLoaded', () => {
    renderProjects();
    renderGallery();
    observeElements();
    initSections();
});
