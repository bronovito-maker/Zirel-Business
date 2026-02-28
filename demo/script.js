document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.padding = '1rem 4rem';
            navbar.style.boxShadow = '0 10px 30px rgba(0,0,0,0.05)';
            document.querySelectorAll('.nav-links a').forEach(a => a.style.color = '#003049');
            document.querySelector('.logo').style.color = '#003049';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.1)';
            navbar.style.padding = '1.5rem 4rem';
            navbar.style.boxShadow = 'none';
            document.querySelectorAll('.nav-links a').forEach(a => a.style.color = '#ffffff');
            document.querySelector('.logo').style.color = '#ffffff';
        }
    });

    // Smooth Scroll for links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
});
