function updateTopBarState() {
    const topBar = document.querySelector('.top-bar');

    if (!topBar) {
        return;
    }

    topBar.classList.toggle('top-bar--scrolled', window.scrollY > 0);
}

window.addEventListener('scroll', updateTopBarState, { passive: true });
window.addEventListener('DOMContentLoaded', updateTopBarState);
window.addEventListener('load', updateTopBarState);