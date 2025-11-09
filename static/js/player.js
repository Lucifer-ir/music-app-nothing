document.addEventListener('DOMContentLoaded', () => {
    const audioPlayer = document.getElementById('audio-player');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    const albumArt = document.getElementById('album-art');
    const trackTitle = document.getElementById('track-title');
    const trackArtist = document.getElementById('track-artist');

    const playlistItems = document.querySelectorAll('#playlist li');
    let currentTrackIndex = 0;

    function loadTrack(index) {
        const track = playlistItems[index];
        if (!track) return;

        audioPlayer.src = track.dataset.src;
        albumArt.src = track.dataset.art;
        trackTitle.textContent = track.dataset.title;
        trackArtist.textContent = track.dataset.artist;

        // Highlight active track
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

    // Event Listeners
    playPauseBtn.addEventListener('click', playPause);
    nextBtn.addEventListener('click', playNext);
    prevBtn.addEventListener('click', playPrev);

    playlistItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            loadTrack(index);
            audioPlayer.play();
            playPauseBtn.textContent = 'PAUSE';
        });
    });
    
    // Load the first track initially
    if (playlistItems.length > 0) {
        loadTrack(0);
        playlistItems[0].classList.add('active');
    }
});
