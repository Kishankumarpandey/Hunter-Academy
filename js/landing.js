const nextBtn = document.getElementById('next-video-btn');
const videoElement = document.getElementById('main-hero-video');

// List of video files (make sure these exist in assets/videos)
const videos = [
    'assets/videos/hero-1.mp4',
    'assets/videos/hero-2.mp4',
    'assets/videos/hero-3.mp4'
];

let currentIndex = 0;

nextBtn.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % videos.length; // Loop back to 0
    
    // Smooth transition effect
    videoElement.style.opacity = '0';
    
    setTimeout(() => {
        videoElement.src = videos[currentIndex];
        videoElement.play();
        videoElement.style.opacity = '0.6'; // Restore opacity
    }, 500);
});