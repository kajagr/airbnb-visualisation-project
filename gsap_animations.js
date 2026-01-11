/**
 * GSAP Animations - Minimal Start
 * Just narrative fade-in and number counters
 */

function initGSAPAnimations() {
    // Register ScrollTrigger plugin
    gsap.registerPlugin(ScrollTrigger);
    
    console.log('🎨 Initializing animations...');
    
    // ========================================================================
    // 1. PARALLAX HERO EFFECT
    // ========================================================================
    
    const parallaxLayers = document.querySelectorAll('.parallax-layer');
    
    if (parallaxLayers.length > 0) {
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            
            parallaxLayers.forEach((layer, index) => {
                // Each layer moves at a different speed
                // Furthest layers (low index) move slower
                const speed = (index + 1) * 0.15;
                layer.style.transform = `translateY(-${scrollY * speed}px)`;
            });
        });
    }
    
    // ========================================================================
    // 2. NARRATIVE STEPS FADE IN + SLIDE UP
    // ========================================================================
    
    gsap.utils.toArray('.narrative-step').forEach((step) => {
        gsap.from(step, {
            opacity: 0,
            y: 30,
            duration: 0.5,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: step,
                start: 'top 85%',
                toggleActions: 'play none none reverse'
            }
        });
    });
    
    // Also animate full-width narrative steps (in Act 7)
    gsap.utils.toArray('.narrative-step-full').forEach((step) => {
        gsap.from(step, {
            opacity: 0,
            y: 30,
            duration: 0.3,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: step,
                start: 'top 85%',
                toggleActions: 'play none none reverse'
            }
        });
    });
    
    // ========================================================================
    // 3. NUMBER COUNTERS (All .city-stat elements)
    // ========================================================================
    
    document.querySelectorAll('.city-stat').forEach((stat) => {
        // Extract the number from text (e.g. "96,871" or "96871")
        const text = stat.textContent.replace(/[^0-9]/g, '');
        const targetValue = parseInt(text, 10);
        
        if (!isNaN(targetValue)) {
            // Store original text format for later
            const originalText = stat.textContent;
            const hasCommas = originalText.includes(',');
            
            // Create animation object
            const obj = { value: 0 };
            
            gsap.to(obj, {
                value: targetValue,
                duration: 2,
                ease: 'power1.out',
                onUpdate: () => {
                    const currentValue = Math.floor(obj.value);
                    // Format with commas if original had them
                    stat.textContent = hasCommas ? currentValue.toLocaleString() : currentValue.toString();
                },
                scrollTrigger: {
                    trigger: stat,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                }
            });
        }
    });
    
    // ========================================================================
    // 4. ACT BACKGROUND COLOR SHIFTS (Using data attributes)
    // ========================================================================
    
    const scrollColorElems = document.querySelectorAll("[data-bgcolor]");
    
    scrollColorElems.forEach((colorSection, i) => {
        const prevBg = i === 0 ? "#F7F7F7" : scrollColorElems[i - 1].dataset.bgcolor;
        
        ScrollTrigger.create({
            trigger: colorSection,
            start: "top 50%",
            onEnter: () => {
                gsap.to("body", {
                    backgroundColor: colorSection.dataset.bgcolor,
                    duration: 0.6,
                    ease: "power2.out"
                });
            },
            onLeaveBack: () => {
                gsap.to("body", {
                    backgroundColor: prevBg,
                    duration: 0.6,
                    ease: "power2.out"
                });
            }
        });
    });
    
    console.log('✅ Animations initialized');
}

// Export for use in app.js
window.initGSAPAnimations = initGSAPAnimations;