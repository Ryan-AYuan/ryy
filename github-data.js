
// Default Configuration
const DEFAULT_CONFIG = {
    owner: 'Ryan-AYuan',
    repo: 'ryy',
    branch: 'main'
};

// Custom Project Metadata (Overrides auto-generated values)
const PROJECT_METADATA = {
    "christmas_tree_20251225.html": {
        title: "🎄 Golden 3D Star Christmas Tree 🎄", 
        date: "2025-12-25", 
        desc: "A mesmerizing 3D Christmas tree animation with rotating stars and snow effects."
    },
    "heart_animation_20251222.html": { 
        title: "❤️ Heart Animation ❤️",
        date: "2025-12-22", 
        desc: "An interactive heart popup animation with confetti effects and floating particles." 
    },
    "wishes_20251230.html": {
        title: "💗 Wishes 💗",
        date: "2025-12-30", 
        desc: "A heartfelt wishes page for my ryy."
    },
    "heart_tree_20260108.html": {
        title: "💗 Heart Tree 💗",
        date: "2026-01-08", 
        desc: "A 3D heart tree animation with interactive controls and particle effects."
    },
    "heart_particle_3d_20260108.html": {
        title: "💗 Heart Particle 3D 💗",
        date: "2026-01-08", 
        desc: "A 3D heart animation with particle effects and interactive controls."
    },
    "memory_game_20260213.html": {
        title: "🧠 Memory Game 🧠",
        date: "2026-02-13", 
        desc: "A fun memory game where you match pairs of cards."
    }
    // Add more files here as needed:
};

// Only these albums under photo/ are shown on the site.
// Other folders (e.g. photo/2025, photo/2026) are ignored.
const PHOTO_ALBUMS = {
    'moments_of_love': { title: 'Moments of Love', order: 0 },
    'forever&3k': { title: 'Forever & 3k', order: 1 }
};

// Global siteData object (initially empty)
var siteData = {
    projects: [],
    photos: {},
    music: [],
    anniversary: "2025-12-13" // Default anniversary
};

// Helper to format title from filename
function formatTitle(filename) {
    // Remove extension
    let name = filename.replace(/\.[^/.]+$/, "");
    // Remove date prefix/suffix if present (simple heuristic)
    name = name.replace(/[-_]\d{8}/, "").replace(/\d{8}[-_]/, "");
    
    // Preserve " - " separator
    name = name.replace(/ - /g, "###HYPHEN###");
    
    // Replace other underscores/dashes with spaces
    name = name.replace(/[-_]/g, " ");
    
    // Restore " - "
    name = name.replace(/###HYPHEN###/g, " - ");
    
    // Capitalize
    return name.charAt(0).toUpperCase() + name.slice(1);
}

// Helper to extract date from filename (YYYYMMDD or YYYY-MM-DD)
function extractDate(filename) {
    const match = filename.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
    if (match) {
        return `${match[1]}-${match[2]}-${match[3]}`;
    }
    return new Date().toISOString().split('T')[0]; // Default to today
}

async function fetchGitHubData() {
    const token = localStorage.getItem('gh_token');
    const owner = localStorage.getItem('gh_owner') || DEFAULT_CONFIG.owner;
    const repo = localStorage.getItem('gh_repo') || DEFAULT_CONFIG.repo;
    const branch = localStorage.getItem('gh_branch') || DEFAULT_CONFIG.branch;

    console.log(`Fetching data from ${owner}/${repo} (${branch})...`);

    const headers = {
        'Accept': 'application/vnd.github.v3+json'
    };
    if (token) {
        headers['Authorization'] = `token ${token}`;
    }

    try {
        // Use the Git Tree API for recursive listing (much faster/efficient)
        // Add timestamp to prevent caching
        const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1&t=${new Date().getTime()}`;
        const response = await fetch(treeUrl, { headers });

        if (!response.ok) {
            throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Reset data
        siteData.projects = [];
        siteData.photos = {};
        siteData.music = [];

        // Process Tree
        data.tree.forEach(item => {
            if (item.type !== 'blob') return; // Skip directories

            const path = item.path;
            
            // 1. Projects (in code/ folder, .html files)
            if (path.startsWith('code/') && path.endsWith('.html')) {
                const filename = path.split('/').pop();
                const metadata = PROJECT_METADATA[filename] || {};
                
                // Construct GitHub Pages URL
                // Format: https://{owner}.github.io/{repo}/{path}
                const pagesUrl = `https://${owner}.github.io/${repo}/${path}`;

                siteData.projects.push({
                    title: metadata.title || formatTitle(filename),
                    date: metadata.date || extractDate(filename),
                    desc: metadata.desc || "Interactive Web Animation",
                    link: pagesUrl
                });
            }

            // 2. Photos (in photo/{album}/ folder)
            // Expected path: photo/moments_of_love/image.jpg
            else if (path.startsWith('photo/')) {
                const parts = path.split('/');
                if (parts.length !== 3) return;

                const albumId = parts[1];
                const filename = parts[2];
                const album = PHOTO_ALBUMS[albumId];
                if (!album) return;
                if (!filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return;

                if (!siteData.photos[albumId]) siteData.photos[albumId] = [];

                // Construct Raw GitHub URL to ensure images load even if running locally (and file is only on cloud)
                // Encode path parts to handle spaces/special chars (e.g. &)
                const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path.split('/').map(encodeURIComponent).join('/')}`;

                siteData.photos[albumId].push({
                    src: rawUrl,
                    blobUrl: item.url, // Store API Blob URL for private repo access
                    caption: album.title,
                    filename: filename
                });
            }

            // 3. Music (in bgm/ folder)
            // User specified that bgm folder contains mp3 files.
            else if (path.startsWith('bgm/') && path.match(/\.mp3$/i)) {
                const filename = path.split('/').pop();
                const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path.split('/').map(encodeURIComponent).join('/')}`;
                siteData.music.push({
                    title: formatTitle(filename),
                    src: rawUrl,
                    blobUrl: item.url // Store API Blob URL for private repo access
                });
            }
        });

        // Sort Projects by date desc
        siteData.projects.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Sort photos in each album by filename
        Object.keys(siteData.photos).forEach(albumId => {
            siteData.photos[albumId].sort((a, b) => a.filename.localeCompare(b.filename, 'en'));
        });

        console.log("Data loaded successfully:", siteData);
        
        // Dispatch event
        document.dispatchEvent(new CustomEvent('SiteDataLoaded'));

    } catch (error) {
        console.error("Failed to fetch data:", error);
        const container = document.querySelector('main');
        if (container) {
            const errorDiv = document.createElement('div');
            errorDiv.style.textAlign = 'center';
            errorDiv.style.padding = '2rem';
            errorDiv.style.color = '#721c24';
            errorDiv.style.backgroundColor = '#f8d7da';
            errorDiv.style.borderRadius = '12px';
            errorDiv.style.marginBottom = '2rem';
            errorDiv.style.border = '1px solid #f5c6cb';
            
            errorDiv.innerHTML = `
                <h3 style="margin-top:0">⚠️ Connection Failed</h3>
                <p>Error: ${error.message}</p>
                <p>Unable to load content. If this is a private repository, please configure your access token.</p>
                <button onclick="openConfig()" style="
                    background: #ff99ac; color: white; border: none; 
                    padding: 10px 25px; border-radius: 50px; cursor: pointer; margin-top: 10px;
                    font-size: 1rem; box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                ">Configure Settings</button>
            `;
            container.prepend(errorDiv);
        }
    }
}

// Start fetching immediately
fetchGitHubData();