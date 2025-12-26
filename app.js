// Core Application Logic & Configuration

// 0. Config Logic
window.openConfig = () => {
    document.getElementById('configToken').value = localStorage.getItem('gh_token') || '';
    document.getElementById('configOwner').value = localStorage.getItem('gh_owner') || 'Ryan-AYuan';
    document.getElementById('configRepo').value = localStorage.getItem('gh_repo') || 'ryy';
    document.getElementById('configBranch').value = localStorage.getItem('gh_branch') || 'main';
    
    const modal = document.getElementById('configModal');
    modal.style.display = 'flex';
    // Small delay to allow display:flex to apply before opacity transition
    setTimeout(() => {
        modal.classList.add('active');
        document.querySelector('.config-overlay').classList.add('active');
    }, 10);
};

window.closeConfig = () => {
    const modal = document.getElementById('configModal');
    modal.classList.remove('active');
    document.querySelector('.config-overlay').classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
};

window.saveConfig = () => {
    const token = document.getElementById('configToken').value.trim();
    const owner = document.getElementById('configOwner').value.trim();
    const repo = document.getElementById('configRepo').value.trim();
    const branch = document.getElementById('configBranch').value.trim();

    if (token) localStorage.setItem('gh_token', token);
    else localStorage.removeItem('gh_token');
    
    if (owner) localStorage.setItem('gh_owner', owner);
    if (repo) localStorage.setItem('gh_repo', repo);
    if (branch) localStorage.setItem('gh_branch', branch);

    location.reload();
};

window.checkRateLimit = async () => {
    const token = document.getElementById('configToken').value || localStorage.getItem('gh_token');
    const resultSpan = document.getElementById('rateLimitResult');
    
    if (!token) {
        resultSpan.textContent = "Token required";
        resultSpan.style.color = "red";
        return;
    }
    
    resultSpan.textContent = "Checking...";
    resultSpan.style.color = "#666";
    
    try {
        const response = await fetch('https://api.github.com/rate_limit', {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const core = data.resources.core;
            const used = core.limit - core.remaining;
            const resetTime = new Date(core.reset * 1000).toLocaleTimeString();
            resultSpan.innerHTML = `Used: <b>${used}</b> / ${core.limit} (Reset: ${resetTime})`;
            resultSpan.style.color = "green";
        } else {
            resultSpan.textContent = `Error: ${response.status}`;
            resultSpan.style.color = "red";
        }
    } catch (e) {
        console.error(e);
        resultSpan.textContent = "Network Error";
        resultSpan.style.color = "red";
    }
};

// Helper for authenticated content loading (for private repos)
// Uses GitHub API Blob endpoint to bypass Raw content CORS issues
window.loadAuthenticatedImage = async (img, url, blobUrl) => {
    const token = localStorage.getItem('gh_token');
    
    // If no token, use the URL as is (browser will try to load it)
    if (!token) {
        img.src = url;
        return;
    }

    try {
        // Method A: Try API Blob with Raw Accept Header (Best for Private Repos)
        // This fetches the raw binary directly, skipping Base64 decoding issues
        if (blobUrl) {
            const response = await fetch(blobUrl, {
                headers: { 
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3.raw'
                }
            });
            
            if (response.ok) {
                const blob = await response.blob();
                img.src = URL.createObjectURL(blob);
                return;
            }
        }

        // Method B: Try Raw URL with Auth (Fallback)
        // Note: raw.githubusercontent.com might not support CORS with Auth headers in some cases
        if (url.includes('raw.githubusercontent.com')) {
            const response = await fetch(url, {
                headers: { 'Authorization': `token ${token}` }
            });
            
            if (response.ok) {
                const blob = await response.blob();
                img.src = URL.createObjectURL(blob);
            } else {
                // If auth fetch fails, try direct load (maybe it's public?)
                img.src = url;
            }
        } else {
            // Not a raw URL, just load it
            img.src = url;
        }
    } catch (e) {
        console.warn("Auth load failed, fallback to direct:", url, e);
        // Final fallback: just try to set the src
        img.src = url;
    }
};

// 0. Lock Screen Logic
const initLockScreen = () => {
    const lockScreen = document.getElementById('lock-screen');
    const lockInput = document.getElementById('lockInput');
    const lockBtn = document.getElementById('lockBtn');
    const lockError = document.getElementById('lockError');
    const lockContent = document.querySelector('.lock-content');

    // If no anniversary data is set, remove lock screen
    if (!lockScreen || !siteData.anniversary) {
        if (lockScreen) lockScreen.style.display = 'none'; 
        return;
    }

    const checkDate = () => {
        const inputDate = lockInput.value.trim();
        const targetDate = siteData.anniversary;

        // Allow formats: YYYY-MM-DD or YYYYMMDD
        const cleanInput = inputDate.replace(/-/g, '');
        const cleanTarget = targetDate.replace(/-/g, '');

        if (inputDate === targetDate || cleanInput === cleanTarget) {
            // Success
            lockScreen.classList.add('hidden');
            setTimeout(() => {
                lockScreen.style.display = 'none';
            }, 600);
        } else {
            // Error
            lockError.classList.add('show');
            lockContent.classList.add('shake');
            
            // Fun error messages
            const msgs = ["你真的忘记了呀?💭 是我们的纪念日呢 😫", "脑子是不是都只用来想我啦?🤔 纪念日没有留下位置呢? 📅", "😠 我气你的遗忘,又疼你的慌张~ ❤️", "💔 你输错的不是数字,是我等你的分分秒秒 ⏳", "我以为那是我们共同的密码 🔐,😢 原来只有我在反复默记"];
            lockError.textContent = msgs[Math.floor(Math.random() * msgs.length)];

            setTimeout(() => {
                lockContent.classList.remove('shake');
            }, 500);
        }
    };

    lockBtn.addEventListener('click', checkDate);
    
    lockInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkDate();
        }
    });

    // Clear error on input
    lockInput.addEventListener('input', () => {
        lockError.classList.remove('show');
    });
};

// 4. Music Player Logic
const initMusicPlayer = () => {
    if (!siteData.music || siteData.music.length === 0) return;
    
    const playerContainer = document.getElementById('musicPlayer');
    const playerBtn = document.getElementById('musicBtnContainer');
    const searchToggleBtn = document.getElementById('searchToggleBtn');
    const searchPanel = document.getElementById('musicSearchPanel');
    const searchInput = document.getElementById('musicSearchInput');
    const musicList = document.getElementById('musicList');
    const musicInfo = document.getElementById('musicInfo');

    if (!playerBtn) return; // Safety check

    let isPlaying = false;
    // Start with a random track
    let currentTrackIndex = Math.floor(Math.random() * siteData.music.length);
    const audio = new Audio();
    
    const renderMusicList = (filter = "") => {
        musicList.innerHTML = "";
        const lowerFilter = filter.toLowerCase();
        
        siteData.music.forEach((track, index) => {
            if (track.title.toLowerCase().includes(lowerFilter)) {
                const li = document.createElement('li');
                li.className = 'music-item';
                if (index === currentTrackIndex) li.classList.add('active');
                
                li.innerHTML = `
                    <span>${index === currentTrackIndex && isPlaying ? '🎵' : (index + 1) + '.'}</span>
                    <span style="flex:1; overflow:hidden; text-overflow:ellipsis;">${track.title}</span>
                `;
                
                li.onclick = (e) => {
                    e.stopPropagation();
                    playTrack(index);
                };
                
                musicList.appendChild(li);
            }
        });
    };

    const playTrack = async (index) => {
        if (index >= siteData.music.length) index = 0;
        currentTrackIndex = index;
        
        const track = siteData.music[currentTrackIndex];
        let src = track.src;

        // Update info text
        if (musicInfo) {
            musicInfo.textContent = "Loading: " + track.title;
            musicInfo.style.opacity = 1;
        }

        // Authenticated fetch for private repos
        const token = localStorage.getItem('gh_token');
        if (token) {
            try {
                // Method A: Try API Blob (Best for Private Repos)
                if (track.blobUrl) {
                    const response = await fetch(track.blobUrl, {
                        headers: { 
                            'Authorization': `token ${token}`,
                            'Accept': 'application/vnd.github.v3.raw'
                        }
                    });
                    if (response.ok) {
                        const blob = await response.blob();
                        src = URL.createObjectURL(blob);
                    }
                }
                // Method B: Try Raw URL with Auth (Fallback)
                else if (src.includes('raw.githubusercontent.com')) {
                    const response = await fetch(src, {
                        headers: { 'Authorization': `token ${token}` }
                    });
                    if (response.ok) {
                        const blob = await response.blob();
                        src = URL.createObjectURL(blob);
                    }
                }
            } catch (e) {
                console.error("Audio load failed", e);
            }
        }

        audio.src = src;

        // Update Active State in List
        renderMusicList(searchInput.value);

        try {
            await audio.play();
            isPlaying = true;
            playerBtn.classList.add('playing');
            if (musicInfo) musicInfo.textContent = "Playing: " + track.title;
            renderMusicList(searchInput.value);
        } catch (e) {
            console.log("Playback failed", e);
            if (musicInfo) musicInfo.textContent = "Playback Failed";
        }
    };

    const togglePlay = () => {
        if (isPlaying) {
            audio.pause();
            isPlaying = false;
            playerBtn.classList.remove('playing');
            if (musicInfo) musicInfo.textContent = "Paused";
            renderMusicList(searchInput.value);
        } else {
            // If no source is set, start from current index
            if (!audio.src) {
                    playTrack(currentTrackIndex);
            } else {
                audio.play().then(() => {
                    isPlaying = true;
                    playerBtn.classList.add('playing');
                    if (musicInfo) musicInfo.textContent = "Playing: " + siteData.music[currentTrackIndex].title;
                    renderMusicList(searchInput.value);
                });
            }
        }
    };

    // Auto play next track (Random)
    audio.addEventListener('ended', () => {
        let nextIndex;
        if (siteData.music.length > 1) {
            // Try to find a different track
            do {
                nextIndex = Math.floor(Math.random() * siteData.music.length);
            } while (nextIndex === currentTrackIndex);
        } else {
            nextIndex = 0;
        }
        playTrack(nextIndex);
    });

    // Event Listeners
    playerBtn.addEventListener('click', (e) => {
        // Prevent triggering if search toggle is clicked (bubbling handled manually if needed, but here separation helps)
        if (e.target === searchToggleBtn || searchToggleBtn.contains(e.target)) return;
        togglePlay();
    });

    searchToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent play toggle
        searchPanel.classList.toggle('active');
        if (searchPanel.classList.contains('active')) {
            renderMusicList();
            searchInput.focus();
        }
    });

    // Close search when clicking outside
    document.addEventListener('click', (e) => {
        if (!playerContainer.contains(e.target)) {
            searchPanel.classList.remove('active');
        }
    });

    // Search Filter
    searchInput.addEventListener('input', (e) => {
        renderMusicList(e.target.value);
    });
    
    // Prevent playing when clicking inside search panel
    searchPanel.addEventListener('click', (e) => {
        e.stopPropagation();
    });
};

// 5. Anniversary Timer Logic
const initTimer = () => {
    const timerContainer = document.getElementById('anniversaryTimer');
    if (!timerContainer || !siteData.anniversary) return;

    const startDate = new Date(siteData.anniversary).getTime();
    
    const updateTimer = () => {
        const now = new Date().getTime();
        const diff = now - startDate;
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        timerContainer.innerHTML = `
            <div class="timer-title">Together For</div>
            <div class="timer-display">
                <div class="timer-item">
                    <span class="timer-val">${days}</span>
                    <span class="timer-label">Days</span>
                </div>
                <div class="timer-item">
                    <span class="timer-val">${hours}</span>
                    <span class="timer-label">Hours</span>
                </div>
                <div class="timer-item">
                    <span class="timer-val">${minutes}</span>
                    <span class="timer-label">Mins</span>
                </div>
                <div class="timer-item">
                    <span class="timer-val">${seconds}</span>
                    <span class="timer-label">Secs</span>
                </div>
            </div>
        `;
    };

    updateTimer(); // Initial call
    setInterval(updateTimer, 1000);
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initLockScreen();
    // Start timer immediately with default
    initTimer();
});

// Handle Data Loading for App components
document.addEventListener('SiteDataLoaded', () => {
    initMusicPlayer();
    initTimer(); // Update timer with loaded data
});
