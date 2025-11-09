document.addEventListener('DOMContentLoaded', () => {
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

    const playlistItems = document.querySelectorAll('#playlist li');
    let currentTrackIndex = 0;
    let isDottedArt = true;
    const dotFontElement = document.getElementById('dot-font-data');
    const dotFontData = dotFontElement ? JSON.parse(dotFontElement.textContent) : {};


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
        currentTrackIndex = (currentTrackIndex + 1) % playlistItems.length;
        loadTrack(currentTrackIndex);
        audioPlayer.play();
        playPauseBtn.textContent = 'PAUSE';
    }

    function playPrev() {
        currentTrackIndex = (currentTrackIndex - 1 + playlistItems.length) % playlistItems.length;
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

    playPauseBtn.addEventListener('click', playPause);
    nextBtn.addEventListener('click', playNext);
    prevBtn.addEventListener('click', playPrev);
    const artContainer = document.querySelector('.album-art-container');
    if (artContainer) {
        artContainer.addEventListener('click', toggleAlbumArt);
    }
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('loadedmetadata', generateWaveform);
    waveformContainer.addEventListener('click', seek);

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
        updateTimerDisplay('00:00');
    }
});
