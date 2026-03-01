/**
 * ui-helpers.js — Zirèl UI Logic
 * Gestisce Carousel, FAQ Accordion, Navbar Scroll e Hamburger Menu.
 */

(function () {
    'use strict';

    // ─── Carousel Logic ──────────────────────────────────────────────────────
    const track = document.getElementById('carousel-track');
    const slides = track ? Array.from(track.children) : [];
    const dotsContainer = document.getElementById('carousel-dots');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    let currentIndex = 0;
    let autoScrollTimer;

    function getVisibleCards() {
        if (window.innerWidth < 768) return 1;
        if (window.innerWidth < 1024) return 2;
        return 3;
    }

    function createDots() {
        if (!dotsContainer || !slides || slides.length === 0) return;
        dotsContainer.innerHTML = '';
        const visibleCards = getVisibleCards();
        const dotCount = slides.length - (visibleCards - 1);
        if (dotCount <= 0) return;

        for (let i = 0; i < dotCount; i++) {
            const dot = document.createElement('div');
            dot.classList.add('dot');
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToSlide(i));
            dotsContainer.appendChild(dot);
        }
    }

    function updateCarousel() {
        if (!track || !slides || slides.length === 0) return;
        const cardWidth = slides[0].offsetWidth;
        const gap = 24;
        track.style.transform = `translateX(-${currentIndex * (cardWidth + gap)}px)`;

        // Update dots
        if (dotsContainer) {
            const dots = Array.from(dotsContainer.children);
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === currentIndex);
            });
        }
    }

    function goToSlide(index) {
        if (!slides || slides.length === 0) return;
        const visibleCards = getVisibleCards();
        const maxIndex = slides.length - visibleCards;

        currentIndex = index;
        if (currentIndex < 0) currentIndex = maxIndex;
        if (currentIndex > maxIndex) currentIndex = 0;

        updateCarousel();
        resetTimer();
    }

    function nextSlide() {
        goToSlide(currentIndex + 1);
    }

    function prevSlide() {
        goToSlide(currentIndex - 1);
    }

    function resetTimer() {
        clearInterval(autoScrollTimer);
        autoScrollTimer = setInterval(nextSlide, 5000);
    }

    // Init Carousel
    if (track && slides.length > 0) {
        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', prevSlide);
            nextBtn.addEventListener('click', nextSlide);
        }
        window.addEventListener('resize', () => {
            createDots();
            currentIndex = 0;
            updateCarousel();
        });
        createDots();
        resetTimer();
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
