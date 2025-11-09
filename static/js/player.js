document.addEventListener('DOMContentLoaded', () => {
    const audioPlayer = document.getElementById('audio-player');    
    const playPauseBtn = document.getElementById('play-pause-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    const albumArt = document.getElementById('album-art');
    const trackTitle = document.getElementById('track-title');
    const trackArtist = document.getElementById('track-artist');
    const waveformProgress = document.querySelector('.waveform-progress');
    const waveformContainer = document.querySelector('.waveform-container');
    const waveformBarsContainer = document.querySelector('.waveform-bars');

    const playlistItems = document.querySelectorAll('#playlist li');
    let currentTrackIndex = 0;
    let isDottedArt = true;

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
        albumArt.dataset.dotted = track.dataset.artDotted;
        albumArt.dataset.original = track.dataset.artOriginal;
        albumArt.src = isDottedArt ? albumArt.dataset.dotted : albumArt.dataset.original;

        trackTitle.textContent = track.dataset.title;
        trackArtist.textContent = track.dataset.artist;

        playlistItems.forEach(item => item.classList.remove('active'));
        track.classList.add('active');
        
        currentTrackIndex = index;
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
        if (isDottedArt) {
            albumArt.src = albumArt.dataset.original;
        } else {
            albumArt.src = albumArt.dataset.dotted;
        }
        isDottedArt = !isDottedArt;
    }

    function updateProgress() {
        if (audioPlayer.duration) {
            const progressPercent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            waveformProgress.style.width = `${progressPercent}%`;
        }
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
    albumArt.addEventListener('click', toggleAlbumArt);
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
    }
});
