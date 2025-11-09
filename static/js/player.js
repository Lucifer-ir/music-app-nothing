window.onload = () => {
    const audioPlayer = document.getElementById('audio-player');
    // If the player doesn't exist on the page (e.g., on login page), stop execution.
    if (!audioPlayer) return;

    const playPauseBtn = document.getElementById('play-pause-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    const albumArtDotsContainer = document.getElementById('album-art-dots');
    const albumArtOriginal = document.getElementById('album-art-original');
    const trackTitle = document.getElementById('track-title');
    const trackArtist = document.getElementById('track-artist');
    const timerDisplay = document.querySelector('.timer');
    const waveformProgress = document.querySelector('.waveform-progress');
    const waveformContainer = document.querySelector('.waveform-container');
    const waveformBarsContainer = document.querySelector('.waveform-bars');
    const shuffleBtn = document.getElementById('shuffle-btn');

    let playlistItems = document.querySelectorAll('#playlist li:not(.empty-playlist)');
    let currentTrackIndex = 0;
    let isDottedArt = true;
    let isShuffle = false;
    const dotFontElement = document.getElementById('dot-font-data');
    const dotFontData = dotFontElement ? JSON.parse(dotFontElement.textContent) : {};
    
    let currentVolume = 80; // Default volume
    let currentBass = 50; // Default bass
    let activeJogWheel = null;


    function generateWaveform() {
        waveformBarsContainer.innerHTML = '';

        for (let i = 0; i < 70; i++) {
            const height = Math.random() * 60 + 15;
            const bar = document.createElement('div');
            bar.style.height = `${height}%`;
            waveformBarsContainer.appendChild(bar);
        }
    }

    function loadTrack(index) {
        const track = playlistItems[index];
        if (!track) return;

        audioPlayer.src = track.dataset.src;
        
        trackTitle.textContent = track.dataset.title;
        trackArtist.textContent = track.dataset.artist;

        renderDottedArt(JSON.parse(track.dataset.artDotMatrix));
        albumArtOriginal.src = track.dataset.artOriginalUrl;

        playlistItems.forEach(item => item.classList.remove('active'));
        track.classList.add('active');
        
        currentTrackIndex = index;
        updateTimerDisplay('00:00');
    }

    function playPause() {
        if (audioPlayer.paused) {
            audioPlayer.play();
            playPauseBtn.textContent = 'PAUSE';
        } else {
            audioPlayer.pause();
            playPauseBtn.textContent = 'PLAY';
        }
    }

    function playNext() {
        if (isShuffle) {
            let nextIndex;
            do {
                nextIndex = Math.floor(Math.random() * playlistItems.length);
            } while (playlistItems.length > 1 && nextIndex === currentTrackIndex);
            currentTrackIndex = nextIndex;
        } else {
            currentTrackIndex = (currentTrackIndex + 1) % playlistItems.length;
        }
        loadTrack(currentTrackIndex);
        audioPlayer.play();
        playPauseBtn.textContent = 'PAUSE';
    }

    function playPrev() {
        if (!isShuffle) {
            currentTrackIndex = (currentTrackIndex - 1 + playlistItems.length) % playlistItems.length;
        }
        loadTrack(currentTrackIndex);
        audioPlayer.play();
        playPauseBtn.textContent = 'PAUSE';
    }

    function toggleAlbumArt() {
        const showOriginal = isDottedArt;
        albumArtDotsContainer.style.display = showOriginal ? 'none' : 'grid';
        albumArtOriginal.style.display = showOriginal ? 'block' : 'none';
        isDottedArt = !isDottedArt;
    }

    function updateProgress() {
        if (audioPlayer.duration) {
            const progressPercent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            waveformProgress.style.width = `${progressPercent}%`;

            const currentTime = audioPlayer.currentTime;
            const minutes = Math.floor(currentTime / 60);
            const seconds = Math.floor(currentTime % 60);
            const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            updateTimerDisplay(formattedTime);
        }
    }

    function updateTimerDisplay(timeString) {
        timerDisplay.innerHTML = '';
        for (const char of timeString) {
            const charContainer = document.createElement('div');
            charContainer.className = 'char-container';
            const pattern = dotFontData[char].join('');
            for (const bit of pattern) {
                const dot = document.createElement('div');
                dot.className = 'dot';
                dot.style.opacity = bit === '1' ? '1' : '0.1';
                charContainer.appendChild(dot);
            }
            timerDisplay.appendChild(charContainer);
        }
    }

    function renderDottedArt(dotMatrixData) {
        albumArtDotsContainer.innerHTML = '';
        if (!dotMatrixData) return;

        const { matrix, cols } = dotMatrixData;
        const rows = matrix.length / cols;
        
        matrix.forEach((brightness, i) => {
            const dot = document.createElement('div');
            dot.className = 'dot';
            
            const x = (i % cols) / cols * 100;
            const y = Math.floor(i / cols) / rows * 100;

            dot.style.left = `${x}%`;
            dot.style.top = `${y}%`;
            // Use a power function to increase visual contrast between dark and bright dots
            const scaleValue = brightness ** 1.5;
            dot.style.transform = `scale(${scaleValue})`;
            albumArtDotsContainer.appendChild(dot);
        });
    }

    function seek(event) {
        const width = waveformContainer.clientWidth;
        const clickX = event.offsetX;
        const duration = audioPlayer.duration;

        if (duration) {
            audioPlayer.currentTime = (clickX / width) * duration;
        }
    }

    // ===================================================================
    // NEW JOG WHEEL IMPLEMENTATION - REBUILT FROM SCRATCH
    // ===================================================================

    function initJogWheel(config) {
        const { container, dotsContainer, indicator, onUpdate, initialValue } = config;
        if (!container) return;

        // Define fixed dimensions, ignoring offsetWidth to prevent race conditions
        const CONTAINER_WIDTH = 200;
        const numDots = 40;
        const containerRadius = CONTAINER_WIDTH / 2;
        const pathRadius = containerRadius - 15; // Radius for the path of dots and indicator
        
        const angleRange = 270; 
        const startAngle = 135; // Bottom-left in degrees
        const angleStep = angleRange / (numDots - 1);
        
        let backgroundDots = [];
        for (let i = 0; i < numDots; i++) {
            const angle = startAngle + (i * angleStep);
            const angleRad = angle * (Math.PI / 180);
            const dot = document.createElement('div');
            dot.className = 'jog-dot';

            const x = containerRadius + pathRadius * Math.cos(angleRad) - 3; // 3 is half of dot width
            const y = containerRadius + pathRadius * Math.sin(angleRad) - 3; // 3 is half of dot height

            dot.style.left = `${x}px`;
            dot.style.top = `${y}px`;
            
            dotsContainer.appendChild(dot);
            backgroundDots.push({ element: dot, angle: angle });
        }

        const updateUI = (value) => {
            const currentAngle = startAngle + (value / 100) * angleRange;
            const angleRad = currentAngle * (Math.PI / 180);
            
            const x = containerRadius + pathRadius * Math.cos(angleRad) - (indicator.offsetWidth / 2);
            const y = containerRadius + pathRadius * Math.sin(angleRad) - (indicator.offsetHeight / 2);

            indicator.style.left = `${x}px`;
            indicator.style.top = `${y}px`;

            backgroundDots.forEach(dot => {
                dot.element.classList.toggle('active', dot.angle <= currentAngle);
            });
        };

        config.updateUI = updateUI;
        config.startAngle = startAngle;
        config.angleRange = angleRange;

        indicator.addEventListener('mousedown', (e) => { 
            e.preventDefault(); 
            activeJogWheel = config; 
        });

        // Set the initial position
        updateUI(initialValue);
    }

    function handleGlobalMouseMove(e) {
        if (!activeJogWheel) return;

        const { container, onUpdate, startAngle, angleRange } = activeJogWheel;
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        let angleDeg = (angleRad * 180) / Math.PI;
        if (angleDeg < 0) angleDeg += 360;

        // Convert angle to a 0-100 value based on our allowed range
        let value;
        const relativeAngle = (angleDeg - startAngle + 360) % 360;

        if (relativeAngle > angleRange + 10 && relativeAngle < 360 - 10) { // Dead zone
            value = (relativeAngle > 180) ? 0 : 100; // Snap to start or end
        } else {
            const clampedAngle = Math.max(0, Math.min(relativeAngle, angleRange));
            value = (clampedAngle / angleRange) * 100;
        }

        value = Math.round(value);
        onUpdate(value);
        activeJogWheel.updateUI(value); // Also update the UI
    }

    function setVolume(value) {
        currentVolume = value; // This line was missing!
        audioPlayer.volume = currentVolume / 100;
    }

    function setBass(value) {
        currentBass = value; // This line was missing!
        // In a real scenario, you would connect this to a Web Audio API filter
        console.log("Bass set to:", currentBass);
    }

    function toggleShuffle() {
        isShuffle = !isShuffle;
        shuffleBtn.classList.toggle('active', isShuffle);
    }

    function handleDeleteSong(e) {
        if (!e.target.classList.contains('delete-song-btn')) return;
        
        const listItem = e.target.closest('li');
        const songId = listItem.dataset.songId;

        if (confirm('Are you sure you want to delete this song?')) {
            fetch(`/delete_song/${songId}`, {
                method: 'POST',
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    listItem.remove();
                    // Re-query the playlist items
                    playlistItems = document.querySelectorAll('#playlist li:not(.empty-playlist)');
                    // If the deleted song was playing, load the next one
                    if (listItem.classList.contains('active')) {
                        loadTrack(currentTrackIndex % playlistItems.length);
                    }
                } else {
                    alert('Error deleting song: ' + data.error);
                }
            });
        }
    }

    document.addEventListener('mouseup', () => { activeJogWheel = null; });
    document.addEventListener('mousemove', handleGlobalMouseMove);

    playPauseBtn.addEventListener('click', playPause);
    nextBtn.addEventListener('click', playNext);
    prevBtn.addEventListener('click', playPrev);
    const artContainer = document.querySelector('.album-art-container');
    if (artContainer) {
        artContainer.addEventListener('click', toggleAlbumArt);
    }

    const volumeWheelConfig = {
        container: document.getElementById('jog-wheel-container'),
        dotsContainer: document.getElementById('jog-wheel-dots'),
        indicator: document.getElementById('jog-wheel-indicator'),
        onUpdate: setVolume,
        initialValue: currentVolume
    };

    const bassWheelConfig = {
        container: document.getElementById('bass-wheel-container'),
        dotsContainer: document.getElementById('bass-wheel-dots'),
        indicator: document.getElementById('bass-wheel-indicator'),
        onUpdate: setBass,
        initialValue: currentBass
    };

    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('loadedmetadata', generateWaveform);
    waveformContainer.addEventListener('click', seek);
    shuffleBtn.addEventListener('click', toggleShuffle);
    document.getElementById('playlist').addEventListener('click', handleDeleteSong);
    audioPlayer.addEventListener('ended', playNext); // Auto-play next song

    playlistItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            loadTrack(index);
            audioPlayer.play();
            playPauseBtn.textContent = 'PAUSE';
        });
    });
    
    if (playlistItems.length > 0) {
        loadTrack(0);
        playlistItems[0].classList.add('active');
        generateWaveform();
        setTimeout(() => {
            initJogWheel(volumeWheelConfig);
            initJogWheel(bassWheelConfig);
        }, 0);
        updateTimerDisplay('00:00');
    }
};
