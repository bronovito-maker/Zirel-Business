/**
 * ui-helpers.js — Zirèl UI Logic
 * Gestisce Carousel, FAQ Accordion, Navbar Scroll e Hamburger Menu.
 */

(function () {
    'use strict';

    // ─── Carousel Logic ──────────────────────────────────────────────────────
    const track = document.getElementById('carousel-track');
    let slides = track ? Array.from(track.children) : [];
    const dotsContainer = document.getElementById('carousel-dots');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    const clonesPerSide = 2;
    let currentIndex = clonesPerSide; // Start at first real slide
    let autoScrollTimer;
    let isTransitioning = false;
    let realSlideCount = slides.length;

    // Clone slides for a robust infinite loop that shows neighbors cleanly
    if (track && realSlideCount > 0) {
        const firstClone1 = slides[0].cloneNode(true);
        const firstClone2 = slides.length > 1 ? slides[1].cloneNode(true) : slides[0].cloneNode(true);

        const lastClone1 = slides[realSlideCount - 1].cloneNode(true);
        const lastClone2 = slides.length > 1 ? slides[realSlideCount - 2].cloneNode(true) : slides[0].cloneNode(true);

        firstClone1.classList.add('clone');
        firstClone2.classList.add('clone');
        lastClone1.classList.add('clone');
        lastClone2.classList.add('clone');

        // Append to end
        track.appendChild(firstClone1);
        track.appendChild(firstClone2);

        // Prepend to start (in reverse order to maintain natural flow: last-1, last, 0, 1...)
        track.insertBefore(lastClone1, slides[0]);
        track.insertBefore(lastClone2, lastClone1);

        slides = Array.from(track.children);
    }

    function createDots() {
        if (!dotsContainer || realSlideCount === 0) return;
        dotsContainer.innerHTML = '';

        for (let i = 0; i < realSlideCount; i++) {
            const dot = document.createElement('div');
            dot.classList.add('dot');
            if (i === 0) dot.classList.add('active');

            dot.addEventListener('click', () => {
                if (isTransitioning) return;
                goToSlide(i + clonesPerSide);
            });
            dotsContainer.appendChild(dot);
        }
    }

    function updateCarousel(instant = false) {
        if (!track || slides.length === 0) return;

        const cardWidth = slides[0].offsetWidth;
        const style = window.getComputedStyle(track);
        const gap = parseFloat(style.gap) || 0;
        const containerWidth = track.parentElement.offsetWidth;

        let offset = 0;
        // Center the active card on mobile viewport exactly
        if (window.innerWidth < 768) {
            offset = (containerWidth - cardWidth) / 2;
        }

        if (instant) {
            track.style.transition = 'none';
        } else {
            track.style.transition = 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
        }

        // Apply mathematical centering
        const translation = -(currentIndex * (cardWidth + gap)) + offset;
        track.style.transform = `translateX(${translation}px)`;

        // Update dots to reflect the actual visible non-cloned slide
        if (dotsContainer) {
            const dots = Array.from(dotsContainer.children);
            let activeIndex = currentIndex - clonesPerSide;

            // Handle edgecases logically
            if (activeIndex < 0) {
                activeIndex = realSlideCount + activeIndex;
            } else if (activeIndex >= realSlideCount) {
                activeIndex = activeIndex - realSlideCount;
            }

            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === activeIndex);
            });
        }
    }

    function goToSlide(index) {
        if (!slides || slides.length === 0 || isTransitioning) return;

        currentIndex = index;
        updateCarousel();
        resetTimer();
        isTransitioning = true;
    }

    function nextSlide() {
        if (isTransitioning) return;
        goToSlide(currentIndex + 1);
    }

    function prevSlide() {
        if (isTransitioning) return;
        goToSlide(currentIndex - 1);
    }

    // Handle seamless infinite jump after CSS transition finishes
    if (track) {
        track.addEventListener('transitionend', () => {
            isTransitioning = false;

            // Reached left clones zone
            if (currentIndex < clonesPerSide) {
                currentIndex += realSlideCount;
                updateCarousel(true);
            }
            // Reached right clones zone
            else if (currentIndex >= realSlideCount + clonesPerSide) {
                currentIndex -= realSlideCount;
                updateCarousel(true);
            }
        });
    }

    function resetTimer() {
        clearInterval(autoScrollTimer);
        autoScrollTimer = setInterval(nextSlide, 5000);
    }

    // Init Carousel
    if (track && slides.length > 0) {
        // Jump to first real slide instantly
        updateCarousel(true);

        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', prevSlide);
            nextBtn.addEventListener('click', nextSlide);
        }
        window.addEventListener('resize', () => {
            createDots();
            updateCarousel(true);
        });

        createDots();
        setTimeout(() => resetTimer(), 100);
    }

    // ─── FAQ Accordion Logic ───────────────────────────────────────────────
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        if (question && answer) {
            question.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                // Close all other items
                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('active');
                        const otherAnswer = otherItem.querySelector('.faq-answer');
                        if (otherAnswer) otherAnswer.style.maxHeight = null;
                    }
                });
                // Toggle current item
                if (isActive) {
                    item.classList.remove('active');
                    answer.style.maxHeight = null;
                } else {
                    item.classList.add('active');
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                }
            });
        }
    });

    // ─── Navbar Scroll & Hamburger ──────────────────────────────────────────
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');

    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        });
    }

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('nav-active');
            document.body.style.overflow = navMenu.classList.contains('nav-active') ? 'hidden' : '';
        });

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('nav-active');
                document.body.style.overflow = '';
            });
        });
    }

}());
