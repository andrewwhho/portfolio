/* -------------------------------------------------------------
   ANDREW HO - MUSIC PAGE LOGIC (music.js)
   Aesthetic Theme: Fits Andrew's Portfolio exactly
   Features:
   - Category filtering (Overview, Top Artists, Top Albums, Tracks)
   - Zero unnecessary scrolling: compact responsive layout
   - Official Last.fm 2.0 REST API integration
   - Grid and Chart views
   - Live scrobbles with animated equalizer wave
   - Interactive mouse-reactive waveform dock
   ------------------------------------------------------------- */

(function () {
  'use strict';

  // --- Configuration ---
  const LASTFM_CONFIG = {
    defaultUser: 'yungtract0r', // Set your Last.fm username here
    apiKey: 'ca45675f32551c9ad5ca5c334993b165',
    apiBase: 'https://ws.audioscrobbler.com/2.0/',
    periodCacheTTL: 3600 * 1000,   // 1 hour
    tracksCacheTTL: 180 * 1000,    // 3 minutes
  };

  // --- State ---
  let currentCategory = 'all';
  let currentPeriod = '7day';
  let currentView = 'grid';
  let currentUsername = getActiveUsername();
  let cachedData = {
    artists: [],
    albums: [],
    topTracks: [],
  };

  // --- Helper Functions ---
  function getActiveUsername() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const queryUser = urlParams.get('user');
      if (queryUser) return queryUser.trim();
      const stored = localStorage.getItem('lastfm_user');
      if (stored && stored !== 'uniqlothug') return stored.trim();
      return LASTFM_CONFIG.defaultUser;
    } catch (_) {
      return LASTFM_CONFIG.defaultUser;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatPlays(count) {
    const num = Number(count) || 0;
    return `${num.toLocaleString()} ${num === 1 ? 'play' : 'plays'}`;
  }

  function formatTimeAgo(seconds) {
    if (!seconds) return 'Just now';
    const now = Math.floor(Date.now() / 1000);
    const diff = Math.max(0, now - seconds);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(seconds * 1000).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }

  // --- LocalStorage Cache ---
  function getCache(key, maxAge) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.timestamp || !parsed.payload) return null;
      if (Date.now() - parsed.timestamp > maxAge) return null;
      return parsed.payload;
    } catch (_) {
      return null;
    }
  }

  function setCache(key, payload) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          timestamp: Date.now(),
          payload: payload,
        })
      );
    } catch (_) {}
  }

  // --- Last.fm API Client ---
  async function fetchLastFm(params) {
    const url = new URL(LASTFM_CONFIG.apiBase);
    url.searchParams.set('format', 'json');
    url.searchParams.set('api_key', LASTFM_CONFIG.apiKey);
    url.searchParams.set('user', currentUsername);

    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8500);

    try {
      const res = await fetch(url.toString(), { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Last.fm returned HTTP ${res.status}`);
      }
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  // 1. Fetch Top Artists
  async function getTopArtists(period) {
    const data = await fetchLastFm({
      method: 'user.gettopartists',
      period: period,
      limit: '10',
    });

    const artists = data?.topartists?.artist || [];
    return artists.map(a => ({
      name: a.name || 'Unknown Artist',
      playcount: Number(a.playcount) || 0,
      url: a.url || `https://www.last.fm/music/${encodeURIComponent(a.name || '')}`,
      imageUrl: null,
    }));
  }

  // 2. Fetch Top Albums
  async function getTopAlbums(period) {
    const data = await fetchLastFm({
      method: 'user.gettopalbums',
      period: period,
      limit: '10',
    });

    const albums = data?.topalbums?.album || [];
    return albums.map(a => {
      let img = null;
      if (Array.isArray(a.image)) {
        const found =
          a.image.find(i => i.size === 'extralarge') ||
          a.image.find(i => i.size === 'large') ||
          a.image.find(i => i.size === 'medium');
        if (found && found['#text'] && !found['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f')) {
          img = found['#text'];
        }
      }

      return {
        name: a.name || 'Unknown Album',
        artist: (typeof a.artist === 'object' ? a.artist?.name : a.artist) || '',
        playcount: Number(a.playcount) || 0,
        url: a.url || `https://www.last.fm/music/${encodeURIComponent(a.name || '')}`,
        imageUrl: img,
      };
    });
  }

  // 3. Fetch Top Tracks
  async function getTopTracks(period) {
    const data = await fetchLastFm({
      method: 'user.gettoptracks',
      period: period,
      limit: '10',
    });

    const tracks = data?.toptracks?.track || [];
    return tracks.map(t => {
      let img = null;
      if (Array.isArray(t.image)) {
        const found =
          t.image.find(i => i.size === 'large') ||
          t.image.find(i => i.size === 'medium') ||
          t.image.find(i => i.size === 'extralarge');
        if (found && found['#text'] && !found['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f')) {
          img = found['#text'];
        }
      }

      return {
        name: t.name || 'Unknown Track',
        artist: (typeof t.artist === 'object' ? t.artist?.name : t.artist) || '',
        playcount: Number(t.playcount) || 0,
        url: t.url || `https://www.last.fm/music/${encodeURIComponent(t.artist?.name || '')}/_/${encodeURIComponent(t.name || '')}`,
        imageUrl: img,
      };
    });
  }

  // 4. Fetch Recent Tracks
  async function getRecentTracks() {
    const data = await fetchLastFm({
      method: 'user.getrecenttracks',
      limit: '10',
    });

    const tracks = data?.recenttracks?.track || [];
    return tracks.map(t => {
      const isNowPlaying = t['@attr'] && t['@attr'].nowplaying === 'true';
      let img = null;
      if (Array.isArray(t.image)) {
        const found =
          t.image.find(i => i.size === 'large') ||
          t.image.find(i => i.size === 'medium') ||
          t.image.find(i => i.size === 'extralarge');
        if (found && found['#text'] && !found['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f')) {
          img = found['#text'];
        }
      }

      return {
        name: t.name || 'Unknown Track',
        artist: (typeof t.artist === 'object' ? t.artist['#text'] : t.artist) || '',
        url: t.url || '',
        imageUrl: img,
        timestamp: isNowPlaying ? null : (t.date?.uts ? Number(t.date.uts) : null),
        isNowPlaying: isNowPlaying,
      };
    });
  }

  // --- Skeletons ---
  function renderSkeletons() {
    const skeletonCard = '<div class="music-skeleton-card"></div>';
    const skeletonRow = '<div class="music-skeleton-row"></div>';

    const artistsGrid = document.getElementById('artists-grid');
    const albumsGrid = document.getElementById('albums-grid');
    const topTracksList = document.getElementById('top-tracks-list');

    if (artistsGrid) artistsGrid.innerHTML = skeletonCard.repeat(5);
    if (albumsGrid) albumsGrid.innerHTML = skeletonCard.repeat(5);
    if (topTracksList) {
      topTracksList.innerHTML = `<div style="display:flex;flex-direction:column;gap:6px;">${skeletonRow.repeat(5)}</div>`;
    }
  }

  // --- Resolve Missing Artist Covers via Last.fm Top Album ---
  async function resolveArtistCover(artistName) {
    if (!artistName) return null;
    const cacheKey = `lastfm_art_cov_${artistName.toLowerCase()}`;
    const cached = getCache(cacheKey, 30 * 86400 * 1000);
    if (cached) return cached;

    try {
      const data = await fetchLastFm({
        method: 'artist.gettopalbums',
        artist: artistName,
        limit: '1',
      });

      const album = data?.topalbums?.album?.[0];
      if (album && Array.isArray(album.image)) {
        const found =
          album.image.find(i => i.size === 'extralarge') ||
          album.image.find(i => i.size === 'large') ||
          album.image.find(i => i.size === 'medium');

        if (found && found['#text'] && !found['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f')) {
          const url = found['#text'];
          setCache(cacheKey, url);
          return url;
        }
      }
    } catch (_) {}
    return null;
  }

  // --- Resolve Track Artwork via Last.fm track.getInfo ---
  async function resolveTrackArtwork(artistName, trackName) {
    if (!artistName || !trackName) return null;
    const cacheKey = `lastfm_trk_cov_${artistName.toLowerCase()}_${trackName.toLowerCase()}`;
    const cached = getCache(cacheKey, 30 * 86400 * 1000);
    if (cached) return cached;

    try {
      const data = await fetchLastFm({
        method: 'track.getInfo',
        artist: artistName,
        track: trackName,
      });

      const album = data?.track?.album;
      if (album && Array.isArray(album.image)) {
        const found =
          album.image.find(i => i.size === 'large') ||
          album.image.find(i => i.size === 'medium') ||
          album.image.find(i => i.size === 'extralarge');

        if (found && found['#text'] && !found['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f')) {
          const url = found['#text'];
          setCache(cacheKey, url);
          return url;
        }
      }
    } catch (_) {}

    // Fallback: check artist cover
    const artistCover = await resolveArtistCover(artistName);
    if (artistCover) {
      setCache(cacheKey, artistCover);
      return artistCover;
    }

    return null;
  }

  // --- Artist-to-Album Artwork Mapper ---
  function getArtistArtworkMap(albums) {
    const map = new Map();
    if (!Array.isArray(albums)) return map;
    for (const a of albums) {
      if (a.artist && a.imageUrl && !map.has(a.artist.toLowerCase())) {
        map.set(a.artist.toLowerCase(), a.imageUrl);
      }
    }
    return map;
  }

  // --- Render Artists (Grid View) ---
  function renderArtistsGrid(artists, artworkMap) {
    const container = document.getElementById('artists-container');
    if (!container) return;

    if (!artists || artists.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:12px 0;">No artist data available for this period.</p>';
      return;
    }

    const cardsHtml = artists
      .map((artist, idx) => {
        const rank = String(idx + 1).padStart(2, '0');
        const imgUrl = artist.imageUrl || artworkMap.get(artist.name?.toLowerCase()) || null;
        const imgMarkup = imgUrl
          ? `<img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(artist.name)}" loading="lazy" decoding="async" />`
          : `<div class="music-card-placeholder">♫</div>`;

        return `
          <a href="${escapeHtml(artist.url)}" target="_blank" rel="noopener noreferrer" class="music-card">
            <div class="music-card-img-wrap" id="artist-wrap-${idx}">
              ${imgMarkup}
              <span class="music-rank-badge">#${rank}</span>
            </div>
            <div class="music-card-info">
              <span class="music-card-title">${escapeHtml(artist.name)}</span>
              <span class="music-card-subtitle">Artist</span>
              <div class="music-card-footer">
                <span class="music-play-tag">${formatPlays(artist.playcount)}</span>
              </div>
            </div>
          </a>
        `;
      })
      .join('');

    container.innerHTML = `<div class="music-cards-grid">${cardsHtml}</div>`;

    // Progressive background resolution for any card still showing placeholder
    artists.forEach((artist, idx) => {
      const currentUrl = artist.imageUrl || artworkMap.get(artist.name?.toLowerCase());
      if (!currentUrl) {
        resolveArtistCover(artist.name).then(resolved => {
          if (resolved) {
            artist.imageUrl = resolved;
            const wrap = document.getElementById(`artist-wrap-${idx}`);
            if (wrap) {
              const rank = String(idx + 1).padStart(2, '0');
              wrap.innerHTML = `<img src="${escapeHtml(resolved)}" alt="${escapeHtml(artist.name)}" loading="lazy" decoding="async" /><span class="music-rank-badge">#${rank}</span>`;
            }
          }
        });
      }
    });
  }

  // --- Render Albums (Grid View) ---
  function renderAlbumsGrid(albums) {
    const container = document.getElementById('albums-container');
    if (!container) return;

    if (!albums || albums.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:12px 0;">No album data available for this period.</p>';
      return;
    }

    const cardsHtml = albums
      .map((album, idx) => {
        const rank = String(idx + 1).padStart(2, '0');
        const imgMarkup = album.imageUrl
          ? `<img src="${escapeHtml(album.imageUrl)}" alt="${escapeHtml(album.name)}" loading="lazy" decoding="async" />`
          : `<div class="music-card-placeholder">♫</div>`;

        return `
          <a href="${escapeHtml(album.url)}" target="_blank" rel="noopener noreferrer" class="music-card">
            <div class="music-card-img-wrap">
              ${imgMarkup}
              <span class="music-rank-badge">#${rank}</span>
            </div>
            <div class="music-card-info">
              <span class="music-card-title">${escapeHtml(album.name)}</span>
              <span class="music-card-subtitle">${escapeHtml(album.artist)}</span>
              <div class="music-card-footer">
                <span class="music-play-tag">${formatPlays(album.playcount)}</span>
              </div>
            </div>
          </a>
        `;
      })
      .join('');

    container.innerHTML = `<div class="music-cards-grid">${cardsHtml}</div>`;
  }

  // --- Render Chart View (Horizontal Bars) ---
  function renderChartView(containerId, items, artworkMap = null, isArtist = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!items || items.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:12px 0;">No data available for chart view.</p>';
      return;
    }

    const maxPlays = Math.max(...items.map(i => i.playcount), 1);

    const rowsHtml = items
      .map((item, idx) => {
        const rank = String(idx + 1).padStart(2, '0');
        const percent = Math.max(5, Math.round((item.playcount / maxPlays) * 100));
        const imgUrl = item.imageUrl || (artworkMap && artworkMap.get(item.name?.toLowerCase())) || null;
        const thumbMarkup = imgUrl
          ? `<img src="${escapeHtml(imgUrl)}" alt="" loading="lazy" />`
          : `<div class="music-card-placeholder" style="font-size:14px;">♫</div>`;

        const subtitle = isArtist ? 'Artist' : (item.artist || '');

        return `
          <div class="chart-row">
            <span class="chart-rank">#${rank}</span>
            <div class="chart-thumb">
              ${thumbMarkup}
            </div>
            <div class="chart-details">
              <div class="chart-title">${escapeHtml(item.name)}</div>
              <div class="chart-artist">${escapeHtml(subtitle)}</div>
            </div>
            <div class="chart-bar-track">
              <div class="chart-bar-fill" style="width: ${percent}%;"></div>
            </div>
            <span class="chart-count">${item.playcount.toLocaleString()} plays</span>
          </div>
        `;
      })
      .join('');

    container.innerHTML = `<div class="music-chart-container">${rowsHtml}</div>`;
  }

  // --- Render Top Tracks ---
  function renderTopTracks(tracks) {
    const list = document.getElementById('top-tracks-list');
    if (!list) return;

    if (!tracks || tracks.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:8px 0;">No top tracks available for this period.</p>';
      return;
    }

    list.innerHTML = tracks
      .map((track, idx) => {
        const rank = String(idx + 1).padStart(2, '0');
        const imgMarkup = track.imageUrl
          ? `<img src="${escapeHtml(track.imageUrl)}" alt="${escapeHtml(track.name)}" loading="lazy" />`
          : `<div class="track-thumb-placeholder">♫</div>`;

        return `
          <a href="${escapeHtml(track.url)}" target="_blank" rel="noopener noreferrer" class="track-row">
            <div class="track-row-left">
              <span class="track-index">${rank}</span>
              <div class="track-thumb" id="top-track-thumb-${idx}">
                ${imgMarkup}
              </div>
              <div class="track-text-group">
                <span class="track-name">${escapeHtml(track.name)}</span>
                <span class="track-artist">${escapeHtml(track.artist)}</span>
              </div>
            </div>
            <span class="track-meta">${formatPlays(track.playcount)}</span>
          </a>
        `;
      })
      .join('');

    // Progressive background resolution for top tracks missing album art
    tracks.forEach((track, idx) => {
      if (!track.imageUrl) {
        resolveTrackArtwork(track.artist, track.name).then(resolvedUrl => {
          if (resolvedUrl) {
            track.imageUrl = resolvedUrl;
            const thumbEl = document.getElementById(`top-track-thumb-${idx}`);
            if (thumbEl) {
              thumbEl.innerHTML = `<img src="${escapeHtml(resolvedUrl)}" alt="${escapeHtml(track.name)}" loading="lazy" />`;
            }
          }
        });
      }
    });
  }

  // --- Render Recent Scrobbles ---
  function renderRecentTracks(tracks) {
    const list = document.getElementById('recent-tracks-list');
    if (!list) return;

    if (!tracks || tracks.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:8px 0;">No recent tracks available.</p>';
      return;
    }

    list.innerHTML = tracks
      .map((track, idx) => {
        const rank = String(idx + 1).padStart(2, '0');
        const liveWave = `
          <div class="live-equalizer" role="img" aria-label="Now playing" title="Scrobbling now">
            <span class="eq-bar"></span>
            <span class="eq-bar"></span>
            <span class="eq-bar"></span>
            <span class="eq-bar"></span>
          </div>
        `;

        const meta = track.timestamp === null || track.isNowPlaying
          ? liveWave
          : `<span class="track-meta">${formatTimeAgo(track.timestamp)}</span>`;

        const imgMarkup = track.imageUrl
          ? `<img src="${escapeHtml(track.imageUrl)}" alt="${escapeHtml(track.name)}" loading="lazy" />`
          : `<div class="track-thumb-placeholder">♫</div>`;

        return `
          <a href="${escapeHtml(track.url)}" target="_blank" rel="noopener noreferrer" class="track-row">
            <div class="track-row-left">
              <span class="track-index">${rank}</span>
              <div class="track-thumb" id="recent-track-thumb-${idx}">
                ${imgMarkup}
              </div>
              <div class="track-text-group">
                <span class="track-name">${escapeHtml(track.name)}</span>
                <span class="track-artist">${escapeHtml(track.artist)}</span>
              </div>
            </div>
            ${meta}
          </a>
        `;
      })
      .join('');

    // Progressive background resolution for recent tracks missing album art
    tracks.forEach((track, idx) => {
      if (!track.imageUrl) {
        resolveTrackArtwork(track.artist, track.name).then(resolvedUrl => {
          if (resolvedUrl) {
            track.imageUrl = resolvedUrl;
            const thumbEl = document.getElementById(`recent-track-thumb-${idx}`);
            if (thumbEl) {
              thumbEl.innerHTML = `<img src="${escapeHtml(resolvedUrl)}" alt="${escapeHtml(track.name)}" loading="lazy" />`;
            }
          }
        });
      }
    });
  }

  // --- Category Filter Visibility ---
  function updateCategoryVisibility() {
    const blockArtists = document.getElementById('block-artists');
    const blockAlbums = document.getElementById('block-albums');
    const blockTracks = document.getElementById('block-tracks');

    if (!blockArtists || !blockAlbums || !blockTracks) return;

    if (currentCategory === 'all') {
      blockArtists.classList.remove('hidden');
      blockAlbums.classList.remove('hidden');
      blockTracks.classList.remove('hidden');
    } else if (currentCategory === 'artists') {
      blockArtists.classList.remove('hidden');
      blockAlbums.classList.add('hidden');
      blockTracks.classList.add('hidden');
    } else if (currentCategory === 'albums') {
      blockArtists.classList.add('hidden');
      blockAlbums.classList.remove('hidden');
      blockTracks.classList.add('hidden');
    } else if (currentCategory === 'tracks') {
      blockArtists.classList.add('hidden');
      blockAlbums.classList.add('hidden');
      blockTracks.classList.remove('hidden');
    }
  }

  // --- Load and Display Period Data ---
  async function loadPeriodData(period, skipCache = false) {
    const cacheKey = `lastfm_${currentUsername}_period_${period}`;
    let data = !skipCache ? getCache(cacheKey, LASTFM_CONFIG.periodCacheTTL) : null;

    if (data) {
      cachedData = data;
      renderActiveView();

      // Check if any artist or track in cached data is missing an artwork and heal it
      const missing = (cachedData.artists || []).filter(a => !a.imageUrl);
      const missingTracks = (cachedData.topTracks || []).filter(t => !t.imageUrl);

      if (missing.length > 0 || missingTracks.length > 0) {
        const artworkMap = getArtistArtworkMap(cachedData.albums);
        Promise.allSettled([
          ...missing.map(async a => {
            const key = a.name.toLowerCase();
            const url = artworkMap.get(key) || (await resolveArtistCover(a.name));
            if (url) a.imageUrl = url;
          }),
          ...missingTracks.map(async t => {
            const url = await resolveTrackArtwork(t.artist, t.name);
            if (url) t.imageUrl = url;
          })
        ]).then(() => {
          setCache(cacheKey, cachedData);
          renderActiveView();
        });
      }
      return;
    }

    renderSkeletons();

    try {
      const [artistsRes, albumsRes, tracksRes] = await Promise.allSettled([
        getTopArtists(period),
        getTopAlbums(period),
        getTopTracks(period),
      ]);

      const artists = artistsRes.status === 'fulfilled' ? artistsRes.value : [];
      const albums = albumsRes.status === 'fulfilled' ? albumsRes.value : [];
      const tracks = tracksRes.status === 'fulfilled' ? tracksRes.value : [];

      const artworkMap = getArtistArtworkMap(albums);

      // Match known artwork from albums or persistent cache
      artists.forEach(a => {
        const key = a.name.toLowerCase();
        const cached = getCache(`lastfm_art_cov_${key}`, 30 * 86400 * 1000);
        if (cached) {
          a.imageUrl = cached;
        } else if (artworkMap.has(key)) {
          a.imageUrl = artworkMap.get(key);
          setCache(`lastfm_art_cov_${key}`, a.imageUrl);
        }
      });

      // Parallel resolution for any still-missing artist covers & track artworks
      const missing = artists.filter(a => !a.imageUrl);
      const missingTracks = tracks.filter(t => !t.imageUrl);

      await Promise.allSettled([
        ...missing.map(async a => {
          const url = await resolveArtistCover(a.name);
          if (url) a.imageUrl = url;
        }),
        ...missingTracks.map(async t => {
          const url = await resolveTrackArtwork(t.artist, t.name);
          if (url) t.imageUrl = url;
        })
      ]);

      cachedData = {
        artists: artists,
        albums: albums,
        topTracks: tracks,
      };

      setCache(cacheKey, cachedData);
      renderActiveView();
    } catch (err) {
      console.error('Error loading Last.fm period data:', err);
    }
  }

  // --- Load Recent Tracks ---
  async function loadRecentTracks(skipCache = false) {
    const cacheKey = `lastfm_${currentUsername}_recent_tracks`;
    let data = !skipCache ? getCache(cacheKey, LASTFM_CONFIG.tracksCacheTTL) : null;

    if (data) {
      renderRecentTracks(data);
      return;
    }

    try {
      const tracks = await getRecentTracks();
      setCache(cacheKey, tracks);
      renderRecentTracks(tracks);
    } catch (err) {
      console.error('Error loading recent tracks:', err);
      const list = document.getElementById('recent-tracks-list');
      if (list) {
        list.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:8px 0;">Recent tracks temporarily unavailable.</p>';
      }
    }
  }

  // --- Render Active View ---
  function renderActiveView() {
    const artworkMap = getArtistArtworkMap(cachedData.albums);

    if (currentView === 'chart') {
      renderChartView('artists-container', cachedData.artists, artworkMap, true);
      renderChartView('albums-container', cachedData.albums, null, false);
    } else {
      renderArtistsGrid(cachedData.artists, artworkMap);
      renderAlbumsGrid(cachedData.albums);
    }

    renderTopTracks(cachedData.topTracks);
    updateCategoryVisibility();
  }

  // --- UI Bindings ---
  function setupUIBindings() {
    // 1. Profile Info & Links
    const displayUsernameEl = document.getElementById('displayUsername');
    const lfmProfileBtn = document.getElementById('lfmProfileBtn');
    if (displayUsernameEl) displayUsernameEl.textContent = currentUsername;
    if (lfmProfileBtn) {
      lfmProfileBtn.href = `https://www.last.fm/user/${encodeURIComponent(currentUsername)}`;
    }

    // 2. Category Tabs (Overview, Top Artists, Top Albums, Tracks)
    const catTabs = document.querySelectorAll('.cat-tab');
    catTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const cat = tab.getAttribute('data-cat');
        if (cat === currentCategory) return;

        currentCategory = cat;
        catTabs.forEach(t => {
          const isActive = t === tab;
          t.classList.toggle('active', isActive);
          t.setAttribute('aria-selected', String(isActive));
        });

        updateCategoryVisibility();
      });
    });

    // 3. Period Pills (7D, 1M, 1Y, All)
    const periodPills = document.querySelectorAll('.period-pill');
    periodPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const period = pill.getAttribute('data-period');
        if (period === currentPeriod) return;

        currentPeriod = period;
        periodPills.forEach(p => {
          const isActive = p === pill;
          p.classList.toggle('active', isActive);
          p.setAttribute('aria-pressed', String(isActive));
        });

        loadPeriodData(currentPeriod);
      });
    });

    // 4. View Mode Pills (Grid vs Chart)
    const viewPills = document.querySelectorAll('.view-pill');
    viewPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const view = pill.getAttribute('data-view');
        if (view === currentView) return;

        currentView = view;
        viewPills.forEach(p => {
          const isActive = p === pill;
          p.classList.toggle('active', isActive);
          p.setAttribute('aria-pressed', String(isActive));
        });

        renderActiveView();
      });
    });

    // 5. Mobile Navbar Drawer Toggle
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    if (navToggle && navLinks) {
      navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('open');
        navLinks.classList.toggle('show-menu');
      });

      navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          navToggle.classList.remove('open');
          navLinks.classList.remove('show-menu');
        });
      });
    }
  }

  // --- Ambient Interactive Waveform Visualizer ---
  function initAudioWaveVisualizer() {
    const canvas = document.getElementById('waveViz');
    const wrap = document.getElementById('waveWrap');
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const step = 6;
    const barWidth = 2;
    const minHeight = 3;

    let width = 0;
    let height = 0;
    let mouseX = -1;
    let mouseActive = 0;
    let targetMouseActive = 0;
    let ripples = [];

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = wrap.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function addRipple(x) {
      if (ripples.length > 5) ripples.shift();
      ripples.push({
        x: x,
        age: 0,
        amp: 1.0,
      });
    }

    function render(timestamp) {
      const time = timestamp * 0.0014;
      ctx.clearRect(0, 0, width, height);

      mouseActive += (targetMouseActive - mouseActive) * 0.08;

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.age += 0.035;
        r.amp *= 0.96;
        if (r.amp < 0.01) {
          ripples.splice(i, 1);
        }
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';

      const totalBars = Math.floor(width / step);
      for (let i = 0; i < totalBars; i++) {
        const x = i * step;
        const norm = i / totalBars;

        let wave =
          Math.sin(time * 1.8 + norm * 9.5) * 0.45 +
          Math.sin(time * 1.2 + norm * 19.0 + 1.2) * 0.25 +
          Math.sin(time * 3.1 + norm * 28.0 + 0.8) * 0.15;

        let barH = (wave + 0.85) * 0.5 * (height * 0.65) + minHeight;

        if (mouseActive > 0.01 && mouseX >= 0) {
          const dist = Math.abs(x - mouseX);
          const sigma = 55;
          const boost = Math.exp(-(dist * dist) / (2 * sigma * sigma)) * (height * 0.4) * mouseActive;
          barH += boost;
        }

        for (const r of ripples) {
          const dist = Math.abs(x - r.x);
          const waveFront = r.age * 110;
          const delta = dist - waveFront;
          const pulse = Math.exp(-(delta * delta) / (2 * 28 * 28)) * Math.cos(delta * 0.2) * (height * 0.35) * r.amp;
          barH += Math.max(0, pulse);
        }

        barH = Math.max(minHeight, Math.min(height - 4, barH));
        ctx.fillRect(x, height - barH, barWidth, barH);
      }

      requestAnimationFrame(render);
    }

    wrap.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      targetMouseActive = 1;
    });

    wrap.addEventListener('mouseleave', () => {
      targetMouseActive = 0;
      mouseX = -1;
    });

    wrap.addEventListener('click', e => {
      const rect = canvas.getBoundingClientRect();
      addRipple(e.clientX - rect.left);
    });

    window.addEventListener('resize', resize);

    resize();
    requestAnimationFrame(render);
  }

  // --- Init ---
  document.addEventListener('DOMContentLoaded', () => {
    setupUIBindings();
    initAudioWaveVisualizer();
    loadPeriodData(currentPeriod);
    loadRecentTracks();
  });
})();
