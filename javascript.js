const musicPlaylist = [
    { title: 'Daytona USA Soundtrack - Sky High', src: 'music/Sky High.mp3' },
    { title: 'Jamiroquai - Canned Heat', src: 'music/Canned Heat.mp3' },
    { title: 'Bomfunk MCs - Freestyler', src: 'music/Freestyler.mp3' },
    { title: 'Tenacious D - Tribute', src: 'https://files.catbox.moe/vf2q3r.mp3' },
    { title: 'Half-Life 2 Soundtrack - Tracking Device', src: 'music/Tracking Device.mp3' },
    { title: 'Team Fortress 2 - Right Behind You', src: 'music/Right Behind You.mp3' }
];

const musicStorageKeys = {
    index: 'gab644-music-index',
    time: 'gab644-music-time',
    playing: 'gab644-music-playing',
    volume: 'gab644-music-volume'
};

const musicPlayerState = {
    audio: null,
    currentIndex: 0,
    restoringState: false,
    pendingSeekTime: null
};

function updateTopBarState() {
    const topBar = document.querySelector('.top-bar');

    if (!topBar) {
        return;
    }

    topBar.classList.toggle('top-bar--scrolled', window.scrollY > 0);
}

function clampTrackIndex(index) {
    if (!Number.isFinite(index) || musicPlaylist.length === 0) {
        return 0;
    }

    return Math.max(0, Math.min(musicPlaylist.length - 1, index));
}

function readStoredMusicState() {
    return {
        index: clampTrackIndex(Number.parseInt(localStorage.getItem(musicStorageKeys.index) || '0', 10)),
        time: Math.max(0, Number.parseFloat(localStorage.getItem(musicStorageKeys.time) || '0') || 0),
        playing: localStorage.getItem(musicStorageKeys.playing) === 'true',
        volume: Math.max(0, Math.min(1, Number.parseFloat(localStorage.getItem(musicStorageKeys.volume) || '1') || 1))
    };
}

function storeMusicState() {
    if (!musicPlayerState.audio) {
        return;
    }

    localStorage.setItem(musicStorageKeys.index, String(musicPlayerState.currentIndex));
    localStorage.setItem(musicStorageKeys.time, String(musicPlayerState.audio.currentTime || 0));
    localStorage.setItem(musicStorageKeys.playing, String(!musicPlayerState.audio.paused));
    localStorage.setItem(musicStorageKeys.volume, String(musicPlayerState.audio.volume));
}

function updateMusicPlayerLabel() {
    const label = document.querySelector('[data-music-player-title]');

    if (!label) {
        return;
    }

    label.textContent = musicPlaylist[musicPlayerState.currentIndex]?.title || 'empty track';
}

function updateMusicPlayerButtons() {
    if (musicPlayerState.audio) {
        musicPlayerState.audio.title = musicPlaylist[musicPlayerState.currentIndex]?.title || 'musik plater';
    }
}

function updateMusicTrackButtonStates() {
    const isPlaying = Boolean(musicPlayerState.audio && !musicPlayerState.audio.paused);

    document.querySelectorAll('[data-music-track]').forEach((button) => {
        const trackIndex = Number.parseInt(button.getAttribute('data-music-track') || '0', 10);
        const isActiveTrack = trackIndex === musicPlayerState.currentIndex;

        button.classList.toggle('buttonfilled', isPlaying && isActiveTrack);
        button.classList.toggle('buttonoutline', !(isPlaying && isActiveTrack));
    });
}

function ensureMusicPlayer() {
    if (musicPlayerState.audio) {
        return musicPlayerState.audio;
    }

    if (musicPlaylist.length === 0) {
        return null;
    }

    const existingPlayer = document.querySelector('.music-player');
    if (existingPlayer) {
        musicPlayerState.audio = existingPlayer.querySelector('[data-music-player-audio]');
        return musicPlayerState.audio;
    }

    const wrapper = document.createElement('section');
    wrapper.className = 'music-player';
    wrapper.setAttribute('musik plater');
    wrapper.innerHTML = `
        <div class="music-player__header">
            <div class="music-player__meta">
                <span class="music-player__eyebrow">Now playing</span>
                <strong class="music-player__title" data-music-player-title></strong>
            </div>
            <div class="music-player__nav">
                <button type="button" class="music-player__nav-button" data-music-player-prev title="Previous track"><img src="images/bak.png"></img></button>
                <button type="button" class="music-player__nav-button" data-music-player-next title="Next track"><img src="images/nxt.png"></img></button>
            </div>
        </div>
        <audio class="music-player__audio" data-music-player-audio controls preload="auto"></audio>
    `;

    document.body.appendChild(wrapper);

    musicPlayerState.audio = wrapper.querySelector('[data-music-player-audio]');

    const storedState = readStoredMusicState();
    musicPlayerState.currentIndex = storedState.index;
    musicPlayerState.audio.volume = storedState.volume;
    wrapper.classList.toggle('music-player--visible', storedState.playing || storedState.time > 0);

    wrapper.querySelector('[data-music-player-prev]')?.addEventListener('click', () => stepTrack(-1));
    wrapper.querySelector('[data-music-player-next]')?.addEventListener('click', () => stepTrack(1));

    musicPlayerState.audio.addEventListener('play', () => {
        localStorage.setItem(musicStorageKeys.playing, 'true');
        updateMusicPlayerButtons();
        updateMusicTrackButtonStates();
        storeMusicState();
        wrapper.classList.add('music-player--visible');
    });
    musicPlayerState.audio.addEventListener('pause', () => {
        localStorage.setItem(musicStorageKeys.playing, 'false');
        updateMusicPlayerButtons();
        updateMusicTrackButtonStates();
        storeMusicState();
    });
    musicPlayerState.audio.addEventListener('timeupdate', () => {
        if (!musicPlayerState.restoringState) {
            localStorage.setItem(musicStorageKeys.time, String(musicPlayerState.audio.currentTime || 0));
        }
    });
    musicPlayerState.audio.addEventListener('volumechange', () => {
        localStorage.setItem(musicStorageKeys.volume, String(musicPlayerState.audio.volume));
    });
    musicPlayerState.audio.addEventListener('ended', () => {
        stepTrack(1);
    });
    musicPlayerState.audio.addEventListener('loadedmetadata', () => {
        const stored = readStoredMusicState();
        const seekTime = musicPlayerState.pendingSeekTime ?? stored.time;
        musicPlayerState.restoringState = true;
        musicPlayerState.audio.currentTime = Math.min(seekTime, musicPlayerState.audio.duration || seekTime || 0);
        musicPlayerState.restoringState = false;
        musicPlayerState.pendingSeekTime = null;

        if (stored.playing) {
            musicPlayerState.audio.play().catch(() => {
                localStorage.setItem(musicStorageKeys.playing, 'true');
            });
        }
    });

    return musicPlayerState.audio;
}

function loadTrack(index, shouldPlay, resetTime = true) {
    if (musicPlaylist.length === 0) {
        return;
    }

    ensureMusicPlayer();

    if (!musicPlayerState.audio) {
        return;
    }

    musicPlayerState.currentIndex = clampTrackIndex(index);
    const track = musicPlaylist[musicPlayerState.currentIndex];

    musicPlayerState.audio.src = track.src;
    musicPlayerState.audio.load();
    localStorage.setItem(musicStorageKeys.index, String(musicPlayerState.currentIndex));
    if (resetTime) {
        localStorage.setItem(musicStorageKeys.time, '0');
    }
    updateMusicPlayerLabel();
    updateMusicPlayerButtons();
    updateMusicTrackButtonStates();

    if (shouldPlay) {
        musicPlayerState.audio.play().catch(() => {
            localStorage.setItem(musicStorageKeys.playing, 'true');
        });
    }
}

function playTrack(index) {
    ensureMusicPlayer();

    if (!musicPlayerState.audio) {
        return;
    }

    const storedState = readStoredMusicState();
    const nextIndex = clampTrackIndex(index);

    localStorage.setItem(musicStorageKeys.playing, 'true');

    if (nextIndex !== musicPlayerState.currentIndex) {
        loadTrack(nextIndex, false);
    }

    musicPlayerState.pendingSeekTime = nextIndex === storedState.index ? storedState.time : 0;
    musicPlayerState.audio.play().catch(() => {
        localStorage.setItem(musicStorageKeys.playing, 'true');
    });
    updateMusicPlayerButtons();
}

function stepTrack(direction) {
    if (musicPlaylist.length === 0) {
        return;
    }

    const nextIndex = (musicPlayerState.currentIndex + direction + musicPlaylist.length) % musicPlaylist.length;
    playTrack(nextIndex);
}

function buildMusicPlayer() {
    ensureMusicPlayer();

    if (!musicPlayerState.audio) {
        return;
    }

    const storedState = readStoredMusicState();
    musicPlayerState.currentIndex = storedState.index;
    musicPlayerState.audio.volume = storedState.volume;
    updateMusicPlayerLabel();
    updateMusicPlayerButtons();

    musicPlayerState.pendingSeekTime = storedState.time;
    loadTrack(musicPlayerState.currentIndex, storedState.playing, false);
    updateMusicTrackButtonStates();
}

function bindMusicTrackButtons() {
    document.querySelectorAll('[data-music-track]').forEach((button) => {
        button.addEventListener('click', () => {
            const trackIndex = Number.parseInt(button.getAttribute('data-music-track') || '0', 10);
            playTrack(trackIndex);
        });
    });
}

function syncMusicStateBeforeUnload() {
    storeMusicState();
}

window.addEventListener('scroll', updateTopBarState, { passive: true });
window.addEventListener('DOMContentLoaded', () => {
    updateTopBarState();
    const storedState = readStoredMusicState();
    if (storedState.playing || storedState.time > 0) {
        buildMusicPlayer();
    }
    bindMusicTrackButtons();
    updateMusicPlayerButtons();
    updateMusicTrackButtonStates();
});
window.addEventListener('load', updateTopBarState);
window.addEventListener('beforeunload', syncMusicStateBeforeUnload);

window.GAB644MusicPlayer = {
    playTrack,
    stepTrack
};