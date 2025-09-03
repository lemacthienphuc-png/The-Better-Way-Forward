
// PART 1: Global Variables and p5.js Sketch Setup
// -------------------------------------------------
// These variables will hold instances of the main classes, managing different aspects of the application.

/** @type {Flower} Instance of the Flower class, responsible for the 3D flower visualization. */
let flowerInstance;
/** @type {UIManager} Instance of the UIManager class, handling user interface elements and interactions. */
let uiManagerInstance;
/** @type {AudioManager} Instance of the AudioManager class, managing audio playback (music and sound effects). */
let audioManagerInstance;
/** @type {p5.Renderer} Instance of the p5.js canvas renderer, specifically a WebGL renderer for 3D graphics. */
let p5Canvas;

/**
 * p5.js setup function.
 * This function is called once when the program starts. It's used to define initial environment
 * properties such as screen size and to load media such as images and fonts as run the program.
 * It initializes the canvas, sets up the 3D perspective, and creates instances of the
 * AudioManager, Flower, and UIManager.
 */
function setup() {
    // Attempt to find the designated canvas container element in the HTML.
    const canvasContainerEl = document.getElementById(AppConfig.P5_CANVAS_ID);
    if (canvasContainerEl) {
        // Create a WebGL canvas fitting the container's dimensions and parent it to the container.
        p5Canvas = createCanvas(canvasContainerEl.offsetWidth, canvasContainerEl.offsetHeight, WEBGL);
        p5Canvas.parent(AppConfig.P5_CANVAS_ID);
    } else {
        // Fallback: If the container is not found, create a default-sized canvas.
        console.error(`#${AppConfig.P5_CANVAS_ID} not found! Creating fallback canvas.`);
        p5Canvas = createCanvas(windowWidth - 120, windowHeight - 120, WEBGL); // Fallback if container is smaller
        p5Canvas.position(60, 60); // Default fallback positioning
    }

    // Set the frame rate for the animation.
    frameRate(AppConfig.FLOWER_CONFIG.frameRate);
    // Set up the 3D perspective for the scene.
    // Parameters: field of view, aspect ratio, near clipping plane, far clipping plane.
    perspective(PI / 3.0, width / height, 0.1, 5000);

    // Initialize the AudioManager to handle sound.
    audioManagerInstance = new AudioManager();
    // Initialize the Flower with p5 instance, configuration, initial parameters, and color scheme.
    flowerInstance = new Flower(this, AppConfig.FLOWER_CONFIG, AppConfig.INITIAL_PARAMS, AppConfig.COLOR_SCHEME);
    // Initialize the UIManager with p5 instance, initial parameters, and references to the flower and audio manager.
    uiManagerInstance = new UIManager(this, AppConfig.INITIAL_PARAMS, flowerInstance, audioManagerInstance);

    console.log("3D Flower Experience Initialized.");
}

/**
 * p5.js draw function.
 * Called directly after setup(), the draw() function continuously executes the lines of code
 * contained inside its block until the program is stopped or noLoop() is called.
 * It handles rendering the background, updating animations, and displaying the flower.
 */
function draw() {
    // Determine background color based on the current theme (light or dark).
    const currentThemeIsLight = document.body.classList.contains('theme--light');
    const bgColorHex = currentThemeIsLight ? (AppConfig.COLOR_SCHEME_LIGHT_BG || '#F5F5F5') : (AppConfig.COLOR_SCHEME_DARK_BG || '#0F0F0F');
    const bgColorRgb = Utils.hexToRgb(bgColorHex);
    background(bgColorRgb.r, bgColorRgb.g, bgColorRgb.b);

    // Enable orbiting (camera) controls for navigating the 3D scene.
    // Parameters: sensitivityX, sensitivityY, sensitivityZoom
    orbitControl(1, 1, 0.1);

    // If auto-animation is enabled in the UI, update the flower's parameters.
    if (uiManagerInstance && uiManagerInstance.isAutoAnimating) {
        uiManagerInstance.updateAnimatedFlowerParams();
    }

    // Display the flower.
    if (flowerInstance) {
        flowerInstance.display();
    }
}

/**
 * p5.js windowResized function.
 * This function is called once every time the browser window is resized.
 * It adjusts the canvas dimensions and updates the 3D perspective to match the new window size.
 */
function windowResized() {
    const canvasContainerEl = document.getElementById(AppConfig.P5_CANVAS_ID);
    if (canvasContainerEl) {
        // Resize the canvas to fit the container's new dimensions.
        resizeCanvas(canvasContainerEl.offsetWidth, canvasContainerEl.offsetHeight);
    } else {
        // Fallback: Adjust fallback canvas size based on window dimensions.
        const edgePadding = 70; // Assuming default, or parse from CSS if complex
        resizeCanvas(windowWidth - (2 * edgePadding), windowHeight - (2 * edgePadding));
    }
    // Update the 3D perspective with the new aspect ratio.
    perspective(PI / 3.0, width / height, 0.1, 5000);
}

// PART 2: AudioManager Class
// --------------------------
// Manages all audio-related functionalities, including background music and click sounds.

/**
 * @class AudioManager
 * Handles the playback and control of audio elements within the application.
 * This includes background music and UI interaction sounds.
 */
class AudioManager {
    /**
     * Creates an instance of AudioManager.
     * Initializes references to audio HTML elements and sets up event listeners.
     */
    constructor() {
        /** @type {HTMLAudioElement | null} The HTML audio element for background music. */
        this.music = document.getElementById(AppConfig.AUDIO_FILES.BACKGROUND_MUSIC_ID);
        /** @type {HTMLAudioElement | null} The HTML audio element for click sounds. */
        this.clickSound = document.getElementById(AppConfig.AUDIO_FILES.CLICK_SOUND_ID);

        /**
         * @typedef {object} AudioManagerDOM
         * @property {HTMLElement | null} muteToggleBtn - The button to toggle mute.
         * @property {HTMLElement | null} iconSoundOn - The icon indicating sound is on.
         * @property {HTMLElement | null} iconSoundOff - The icon indicating sound is off.
         */
        /** @type {AudioManagerDOM} References to DOM elements related to audio controls. */
        this.dom = {
            muteToggleBtn: document.getElementById('muteToggleBtn'),
            iconSoundOn: document.querySelector('#muteToggleBtn .icon--sound-on'),
            iconSoundOff: document.querySelector('#muteToggleBtn .icon--sound-off'),
        };

        this._initializeMusic();
        this._setupMuteButton();
    }

    /**
     * Initializes the background music settings.
     * Sets volume, attempts to load saved mute state from localStorage,
     * and handles initial playback.
     * @private
     */
    _initializeMusic() {
        if (this.music) {
            this.music.volume = 0.3; // Set a default volume.
            let startMuted = true; // Default to starting muted.
            try {
                // Check localStorage for a saved mute preference.
                const savedMuteState = localStorage.getItem('musicMuted');
                if (savedMuteState === 'false') startMuted = false;
            } catch (e) { console.warn("localStorage not available for music mute state."); }

            this.music.muted = startMuted;
            if (!startMuted) {
                 // Attempt to play music if not muted; browsers might block autoplay.
                 this.music.play().catch(error => console.log("Background music autoplay prevented:", error.message));
            }
            this.updateMuteButtonVisuals(); // Update button icon based on mute state.
        } else {
            console.error("Background music element not found:", AppConfig.AUDIO_FILES.BACKGROUND_MUSIC_ID);
        }
    }

    /**
     * Sets up the event listener for the mute toggle button.
     * If the music element is missing, the button might be disabled.
     * @private
     */
    _setupMuteButton() {
        if (this.dom.muteToggleBtn && this.music) {
            this.dom.muteToggleBtn.addEventListener('click', () => this.toggleMute());
        } else if (!this.music) {
            console.warn("Mute button found, but music element is missing.");
            if (this.dom.muteToggleBtn) this.dom.muteToggleBtn.disabled = true;
        } else if (!this.dom.muteToggleBtn) {
            // console.warn("Mute toggle button not found in DOM."); // This can be common if UI structure varies
        }
    }

    /**
     * Toggles the mute state of the background music.
     * Plays music if unmuted and paused, saves the state to localStorage,
     * and updates the mute button's visual appearance.
     */
    toggleMute() {
        if (!this.music) return;
        this.music.muted = !this.music.muted;
        if (!this.music.muted && this.music.paused) {
            // If unmuting and music was paused, try to play it.
            this.music.play().catch(e => console.error("Error playing audio on unmute:", e.message));
        }
        try { localStorage.setItem('musicMuted', this.music.muted.toString()); }
        catch (e) { console.warn("localStorage not available. Mute state not saved."); }
        this.updateMuteButtonVisuals();
    }

    /**
     * Updates the visual state of the mute button (sound on/off icons)
     * based on the current mute status of the music.
     */
    updateMuteButtonVisuals() {
        if (!this.dom.iconSoundOn || !this.dom.iconSoundOff || !this.music) return;
        const isMuted = this.music.muted;
        this.dom.iconSoundOn.style.display = isMuted ? 'none' : 'inline-block';
        this.dom.iconSoundOff.style.display = isMuted ? 'inline-block' : 'none';
    }

    /**
     * Plays a short click sound effect.
     * Typically used for UI interactions. Sound only plays if music is not globally muted.
     */
    playClickSound() {
        if (this.clickSound && (!this.music || !this.music.muted)) {
            this.clickSound.currentTime = 0; // Rewind to start for immediate playback.
            this.clickSound.play().catch(e => console.warn("Click sound playback error:", e.message));
        }
    }
}

// PART 3: UIManager Class
// -----------------------
// Manages UI elements, interactions, theme switching, and controls for the flower visualization.

/**
 * @class UIManager
 * Manages all user interface elements and their interactions.
 * This includes control sliders for the flower, theme toggling, information popups,
 * and auto-animation controls.
 */
class UIManager {
    /**
     * Creates an instance of UIManager.
     * @param {p5} p - The p5.js instance.
     * @param {object} initialParams - Initial parameters for the flower controls.
     * @param {Flower} flowerInstance - The instance of the Flower class.
     * @param {AudioManager} audioManagerInstance - The instance of the AudioManager class.
     */
    constructor(p, initialParams, flowerInstance, audioManagerInstance) {
        /** @type {p5} The p5.js instance, used for canvas operations like saving. */
        this.p = p;
        /** @type {object} Current parameters for the flower, mirrored from sliders or auto-animation. */
        this.currentParams = { ...initialParams };
        /** @type {Flower} Reference to the Flower instance to update its parameters. */
        this.flower = flowerInstance;
        /** @type {AudioManager} Reference to the AudioManager for playing UI sounds. */
        this.audioManager = audioManagerInstance;

        /**
         * @typedef {object} UIManagerDOM
         * @property {HTMLElement|null} controlsTrigger - Button to show/hide the controls panel.
         * @property {HTMLElement|null} controlsPanel - Panel containing flower control sliders.
         * @property {HTMLElement|null} slidersArea - Area where sliders are dynamically created.
         * @property {HTMLElement|null} autoAnimationArea - Area for the auto-animation toggle.
         * @property {HTMLElement|null} saveImageBtn - Button to save the canvas as an image.
         * @property {HTMLElement|null} themeToggleBtn - Button to switch between light and dark themes.
         * @property {HTMLElement|null} iconSun - Sun icon for the theme toggle (dark mode active).
         * @property {HTMLElement|null} iconMoon - Moon icon for the theme toggle (light mode active).
         * @property {HTMLElement|null} muteToggleBtn - Button to mute/unmute audio (managed by AudioManager, referenced here for completeness).
         * @property {HTMLElement|null} infoPopupTriggerBtn - Button to show the information popup.
         * @property {HTMLElement|null} infoPopup - The main information popup container.
         * @property {HTMLElement|null} infoPopupCloseBtn - Button to close the information popup.
         * @property {HTMLElement|null} infoPopupContentWrapper - Scrollable wrapper for popup content.
         * @property {HTMLElement|null} infoPopupInitialTitleContainer - Container for the initial large title in the popup.
         * @property {HTMLElement|null} infoPopupSecondaryContentContainer - Container for the detailed secondary content in the popup.
         * @property {HTMLElement|null} stickyHeaderContent - Sticky header within the popup.
         * @property {HTMLElement|null} secondaryContentHeading - Main heading for secondary content.
         * @property {HTMLElement|null} secondaryContentSubheading - Subheading for secondary content.
         * @property {HTMLElement|null} quoteTextElement - Element to display the quote.
         * @property {HTMLElement|null} secondaryContentAttribution - Element for quote attribution.
         * @property {HTMLElement|null} contentBlock1 - First block of scrollable content.
         * @property {HTMLElement|null} contentBlock2 - Second block of scrollable content.
         * @property {HTMLElement|null} additionalParagraphElement - Element for an additional paragraph.
         * @property {HTMLElement|null} contentBlock3 - Third block of scrollable content (credits).
         * @property {HTMLElement|null} callToActionTextElement - Element for the call to action text.
         * @property {HTMLElement|null} creditsLayout - Main container for credits layout.
         * @property {HTMLElement|null} creditsGroupTitle1 - Title for the first credits group.
         * @property {HTMLElement|null} creditsList1 - List for the first credits group.
         * @property {HTMLElement|null} creditsGroupTitle2 - Title for the second credits group.
         * @property {HTMLElement|null} creditsList2 - List for the second credits group.
         * @property {HTMLElement|null} creditsGroupTitle3 - Title for the third credits group.
         * @property {HTMLElement|null} creditsList3 - List for the third credits group.
         * @property {HTMLElement|null} creditsCopyright - Copyright text element.
         */
        /** @type {UIManagerDOM} Collection of references to key DOM elements. */
        this.dom = {
            controlsTrigger: document.getElementById('flowerControlsTrigger'),
            controlsPanel: document.getElementById('controlsPanel'),
            slidersArea: document.getElementById('slidersArea'),
            autoAnimationArea: document.getElementById('autoAnimationArea'),
            saveImageBtn: document.getElementById('saveImageBtn'),
            themeToggleBtn: document.getElementById('themeToggleBtn'),
            iconSun: document.querySelector('#themeToggleBtn .icon--sun'),
            iconMoon: document.querySelector('#themeToggleBtn .icon--moon'),
            muteToggleBtn: document.getElementById('muteToggleBtn'), // Though managed by AudioManager, good to have a ref if needed
            infoPopupTriggerBtn: document.getElementById('infoPopupTriggerBtn'),
            infoPopup: document.getElementById('infoPopup'),
            infoPopupCloseBtn: document.getElementById('infoPopupCloseBtn'),
            infoPopupContentWrapper: document.getElementById('infoPopupContentWrapper'),
            infoPopupInitialTitleContainer: document.getElementById('infoPopupInitialTitleContainer'),
            infoPopupSecondaryContentContainer: document.getElementById('infoPopupSecondaryContentContainer'),
            stickyHeaderContent: document.getElementById('stickyHeaderContent'),
            secondaryContentHeading: document.getElementById('secondaryContentHeading'),
            secondaryContentSubheading: document.getElementById('secondaryContentSubheading'),
            quoteTextElement: document.getElementById('quoteTextElement'),
            secondaryContentAttribution: document.getElementById('secondaryContentAttribution'),
            contentBlock1: document.getElementById('contentBlock1'),
            contentBlock2: document.getElementById('contentBlock2'),
            additionalParagraphElement: document.getElementById('additionalParagraphElement'),
            contentBlock3: document.getElementById('contentBlock3'),
            callToActionTextElement: document.getElementById('callToActionTextElement'),
            // DOM elements for structured credits
            creditsLayout: document.getElementById('creditsLayout'),
            creditsGroupTitle1: document.getElementById('creditsGroupTitle1'),
            creditsList1: document.getElementById('creditsList1'),
            creditsGroupTitle2: document.getElementById('creditsGroupTitle2'),
            creditsList2: document.getElementById('creditsList2'),
            creditsGroupTitle3: document.getElementById('creditsGroupTitle3'),
            creditsList3: document.getElementById('creditsList3'),
            creditsCopyright: document.getElementById('creditsCopyright'),
        };

        /** @type {Object<string, {slider: HTMLInputElement, valueSpan: HTMLSpanElement, definition: object}>} Stores references to slider elements and their value displays. */
        this.flowerSliders = {};
        /** @type {boolean} Flag indicating if auto-animation of flower parameters is active. */
        this.isAutoAnimating = false;
        /** @type {number} Timer variable used for Perlin noise calculation in auto-animation. */
        this.animationTime = 0;
        /** @type {boolean} Flag to track if the secondary content of the info popup has been loaded. */
        this.secondaryContentLoaded = false;

        /** @type {Array<HTMLElement|null>} Array of popup elements to animate on scroll. */
        this.animatablePopupElements = [
            this.dom.infoPopupInitialTitleContainer,
            this.dom.stickyHeaderContent,
            this.dom.contentBlock1,
            this.dom.contentBlock2,
            this.dom.contentBlock3
        ].filter(el => el); // Filter out any null elements to prevent errors.
        /** @type {IntersectionObserver|null} Observer for animating popup elements on scroll. */
        this.popupScrollObserver = null;


        this._setupEventListeners();
        this._initializeTheme();
        this._createSliders();
        this._createAutoAnimationToggle();
        this._setupInitialPopupContent();
        this._positionControlsPanel(); // Initial positioning
        this._initPopupScrollObserver(); // Initialize the scroll observer for popup animations
    }

    /**
     * Sets up event listeners for various UI controls.
     * @private
     */
    _setupEventListeners() {
        if (this.dom.controlsTrigger) this.dom.controlsTrigger.addEventListener('click', (e) => { e.preventDefault(); this.toggleControlsPanel(); });
        if (this.dom.saveImageBtn) this.dom.saveImageBtn.addEventListener('click', () => this.p.saveCanvas(p5Canvas, 'flower_artwork.png'));
        if (this.dom.themeToggleBtn) this.dom.themeToggleBtn.addEventListener('click', () => this.toggleTheme());

        if (this.dom.infoPopupTriggerBtn) this.dom.infoPopupTriggerBtn.addEventListener('click', () => this.showInfoPopup());
        if (this.dom.infoPopupCloseBtn) this.dom.infoPopupCloseBtn.addEventListener('click', () => this.hideInfoPopup());

        // Global click listener for playing click sounds on interactive elements.
        document.body.addEventListener('click', (event) => {
            const target = event.target;
            // Play sound for buttons, range inputs, checkboxes, but not if interacting with p5 canvas itself.
            if (target.closest('button, a[role="button"], input[type="range"], input[type="checkbox"]') && !target.closest(`#${AppConfig.P5_CANVAS_ID}`)) {
                if (this.audioManager) this.audioManager.playClickSound();
            }
        }, true); // Use capture phase to catch clicks early.

        // Reposition controls panel on window resize.
        window.addEventListener('resize', () => this._positionControlsPanel());
    }
    
    /**
     * Initializes the IntersectionObserver for scroll-triggered animations within the info popup.
     * Elements with the 'scroll-animate' class will have 'scroll-animate--in-view' added/removed
     * based on their visibility within the popup's scrollable area.
     * @private
     */
    _initPopupScrollObserver() {
        if (!('IntersectionObserver' in window) || !this.dom.infoPopupContentWrapper) {
            console.warn("IntersectionObserver not supported or popup content wrapper not found. Scroll animations disabled.");
            // Fallback: make all elements visible directly if IntersectionObserver is not available.
            this.animatablePopupElements.forEach(el => {
                if (el) {
                    el.classList.add('scroll-animate', 'scroll-animate--in-view');
                }
            });
            return;
        }

        const observerOptions = {
            root: this.dom.infoPopupContentWrapper, // The scrollable container.
            rootMargin: '0px 0px -50px 0px', // Trigger when element is 50px from the bottom of the wrapper's viewport.
            threshold: 0.1 // Trigger when 10% of the element is visible.
        };

        this.popupScrollObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('scroll-animate--in-view');
                } else {
                    // Elements remain in view once triggered until popup is closed.
                    // To re-animate on each scroll-in, remove class here:
                    // entry.target.classList.remove('scroll-animate--in-view');
                }
            });
        }, observerOptions);

        // Add base 'scroll-animate' class to all animatable elements so styles can target them.
        this.animatablePopupElements.forEach(el => {
            if (el) {
                el.classList.add('scroll-animate');
            }
        });
    }


    /**
     * Initializes the theme (light/dark) based on localStorage or defaults to dark.
     * Updates body class and theme toggle button icons.
     * @private
     */
    _initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark'; // Default to dark if no preference saved
        document.body.classList.remove('theme--light', 'theme--dark'); // Clear existing theme classes
        if (savedTheme === 'light') {
            document.body.classList.add('theme--light');
            if (this.dom.iconSun) this.dom.iconSun.style.display = 'none';
            if (this.dom.iconMoon) this.dom.iconMoon.style.display = 'inline-block';
        } else {
            document.body.classList.add('theme--dark');
            if (this.dom.iconSun) this.dom.iconSun.style.display = 'inline-block';
            if (this.dom.iconMoon) this.dom.iconMoon.style.display = 'none';
        }
    }

    /**
     * Toggles the application theme between light and dark.
     * Saves the preference to localStorage and updates UI elements.
     * Triggers a redraw to update canvas background.
     */
    toggleTheme() {
        document.body.classList.toggle('theme--light');
        document.body.classList.toggle('theme--dark');
        const isLight = document.body.classList.contains('theme--light');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        // Update icon visibility based on the new theme
        if (this.dom.iconSun) this.dom.iconSun.style.display = isLight ? 'none' : 'inline-block';
        if (this.dom.iconMoon) this.dom.iconMoon.style.display = isLight ? 'inline-block' : 'none';
        draw(); // Redraw canvas with new background color.
    }

    /**
     * Toggles the visibility of the flower controls panel.
     * Updates ARIA attributes for accessibility and changes trigger button text.
     */
    toggleControlsPanel() {
        if (!this.dom.controlsPanel || !this.dom.controlsTrigger) return;
        const isVisible = this.dom.controlsPanel.getAttribute('aria-hidden') === 'false';
        if (isVisible) {
            this.dom.controlsPanel.setAttribute('aria-hidden', 'true');
            this.dom.controlsTrigger.innerHTML = '*Flower Controls'; // Text for "show"
            this.dom.controlsTrigger.setAttribute('aria-expanded', 'false');
        } else {
            this.dom.controlsPanel.setAttribute('aria-hidden', 'false');
            this.dom.controlsTrigger.innerHTML = '*Hide Controls'; // Text for "hide"
            this.dom.controlsTrigger.setAttribute('aria-expanded', 'true');
            this._positionControlsPanel(); // Ensure correct positioning when shown.
        }
    }

    /**
     * Positions the controls panel relative to its trigger button.
     * This is useful if the trigger button's position might change (e.g., due to layout shifts).
     * @private
     */
    _positionControlsPanel() {
         if (this.dom.controlsTrigger && this.dom.controlsPanel) {
            const triggerWrapper = this.dom.controlsTrigger.parentElement; // Assuming trigger is wrapped for better positioning ref
            if (triggerWrapper) {
                const triggerRect = triggerWrapper.getBoundingClientRect();
                // Position panel below the trigger.
                this.dom.controlsPanel.style.top = `${triggerRect.bottom}px`;
                this.dom.controlsPanel.style.left = `${triggerRect.left}px`;
            }
        }
    }

    /**
     * Dynamically creates slider controls for flower parameters based on `AppConfig.SLIDER_DEFINITIONS`.
     * Each slider updates the `currentParams` and the flower instance on input.
     * @private
     */
    _createSliders() {
        if (!this.dom.slidersArea) return;
        this.dom.slidersArea.innerHTML = ''; // Clear any existing sliders.
        AppConfig.SLIDER_DEFINITIONS.forEach(def => {
            const container = document.createElement('div');
            container.className = 'slider-container';

            const labelValueWrapper = document.createElement('div');
            labelValueWrapper.className = 'label-value-wrapper';
            container.appendChild(labelValueWrapper);

            const label = document.createElement('label');
            label.textContent = def.label;
            labelValueWrapper.appendChild(label);

            const valueSpan = document.createElement('span');
            valueSpan.className = 'slider-value-display';
            // Format the initial value according to specified decimal places.
            valueSpan.textContent = Number(this.currentParams[def.param]).toFixed(def.decimals);
            labelValueWrapper.appendChild(valueSpan);

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = def.min;
            slider.max = def.max;
            slider.step = def.step;
            slider.value = this.currentParams[def.param];
            container.appendChild(slider);

            // Event listener for slider input.
            slider.addEventListener('input', () => {
                if (this.isAutoAnimating) return; // Don't allow manual changes if auto-animating.
                const newValue = Number(slider.value);
                this.currentParams[def.param] = newValue;
                valueSpan.textContent = newValue.toFixed(def.decimals);
                this.flower.updateParams({ [def.param]: newValue }); // Update the flower.
            });
            this.dom.slidersArea.appendChild(container);
            // Store references to the slider and its value display.
            this.flowerSliders[def.param] = { slider: slider, valueSpan: valueSpan, definition: def };
        });
    }

    /**
     * Creates the toggle switch for enabling/disabling auto-animation of flower parameters.
     * When enabled, sliders are disabled.
     * @private
     */
    _createAutoAnimationToggle() {
        if (!this.dom.autoAnimationArea) return;
        this.dom.autoAnimationArea.innerHTML = ''; // Clear existing toggle.

        const checkboxId = 'autoAnimateCheckbox';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = checkboxId;
        checkbox.checked = this.isAutoAnimating;

        const label = document.createElement('label');
        label.htmlFor = checkboxId;
        label.textContent = ' Auto-Animate Parameters'; // Leading space for alignment with checkbox.

        this.dom.autoAnimationArea.appendChild(checkbox);
        this.dom.autoAnimationArea.appendChild(label);

        checkbox.addEventListener('change', () => {
            this.isAutoAnimating = checkbox.checked;
            Object.values(this.flowerSliders).forEach(s => {
                // Disable/enable sliders based on auto-animation state.
                if (this.isAutoAnimating) {
                    s.slider.setAttribute('disabled', 'true');
                } else {
                    s.slider.removeAttribute('disabled');
                    // Sync currentParams with slider values when turning off auto-animation.
                    this.currentParams[s.definition.param] = Number(s.slider.value);
                }
            });
            if (this.isAutoAnimating) {
                this.animationTime = 0; // Reset animation time.
            } else {
                // When turning off auto-animation, apply current slider values to the flower.
                this.flower.updateParams(this.currentParams);
            }
        });
    }

    /**
     * Updates flower parameters based on Perlin noise when auto-animation is active.
     * Called from the main `draw()` loop. Updates slider UI to reflect animated values.
     */
    updateAnimatedFlowerParams() {
        if (!this.isAutoAnimating) return;
        this.animationTime += AppConfig.AUTO_ANIMATION.PERLIN_NOISE_SPEED;
        // Let the flower instance calculate its new animated parameters.
        const updatedParamsFromFlower = this.flower.autoAnimateParams(this.animationTime);
        this.currentParams = updatedParamsFromFlower; // Sync UIManager's currentParams.

        // Update the UI sliders to reflect the new animated values.
        for (const paramName in this.flowerSliders) {
            const sliderObj = this.flowerSliders[paramName];
            if (this.currentParams.hasOwnProperty(paramName)) {
                sliderObj.slider.value = this.currentParams[paramName];
                sliderObj.valueSpan.textContent = Number(this.currentParams[paramName]).toFixed(sliderObj.definition.decimals);
            }
        }
    }

    /**
     * Sets up the initial content for the info popup, specifically the main title.
     * Calls `_ensureSecondaryPopupContentLoaded` to prepare other content.
     * @private
     */
    _setupInitialPopupContent() {
        if (this.dom.infoPopupInitialTitleContainer) {
            this.dom.infoPopupInitialTitleContainer.innerHTML = ''; // Clear existing content.
            const titleEl = document.createElement('h1');
            titleEl.className = 'title-word'; // For styling (e.g., word-by-word animation).
            titleEl.textContent = AppConfig.POPUP_TEXTS.INITIAL_TITLE;
            this.dom.infoPopupInitialTitleContainer.appendChild(titleEl);
        }
        this._ensureSecondaryPopupContentLoaded(); // Pre-load or ensure secondary content is ready.
    }

    /**
     * Helper function to populate a list element (UL/OL) with items.
     * @param {HTMLElement|null} listElement - The UL or OL element to populate.
     * @param {string[]} items - An array of strings to be added as list items.
     * @private
     */
    _populateList(listElement, items) {
        if (listElement && items && items.length > 0) {
            listElement.innerHTML = ''; // Clear previous items.
            items.forEach(itemText => {
                const li = document.createElement('li');
                li.textContent = itemText;
                listElement.appendChild(li);
            });
        }
    }

    /**
     * Ensures that the secondary content of the info popup (text, quotes, credits) is loaded.
     * This is done once to avoid redundant DOM manipulations.
     * @private
     */
    _ensureSecondaryPopupContentLoaded() {
        if (this.secondaryContentLoaded || !this.dom.infoPopupSecondaryContentContainer) return;

        // Populate text content from AppConfig.
        if(this.dom.secondaryContentHeading) this.dom.secondaryContentHeading.innerHTML = AppConfig.POPUP_TEXTS.SECONDARY_HEADING;
        if(this.dom.secondaryContentSubheading) this.dom.secondaryContentSubheading.innerHTML = AppConfig.POPUP_TEXTS.SECONDARY_SUBHEADING;
        if(this.dom.quoteTextElement) this.dom.quoteTextElement.innerHTML = AppConfig.POPUP_TEXTS.QUOTE;
        if(this.dom.secondaryContentAttribution) this.dom.secondaryContentAttribution.innerHTML = AppConfig.POPUP_TEXTS.ATTRIBUTION;
        if(this.dom.additionalParagraphElement) this.dom.additionalParagraphElement.innerHTML = AppConfig.POPUP_TEXTS.ADDITIONAL_PARAGRAPH;
        
        if(this.dom.callToActionTextElement) this.dom.callToActionTextElement.innerHTML = AppConfig.POPUP_TEXTS.CALL_TO_ACTION;

        // Populate structured credits lists.
        if(this.dom.creditsGroupTitle1) this.dom.creditsGroupTitle1.textContent = AppConfig.POPUP_TEXTS.CREDITS_GROUP_1_TITLE;
        this._populateList(this.dom.creditsList1, AppConfig.POPUP_TEXTS.CREDITS_GROUP_1_LIST);
        
        if(this.dom.creditsGroupTitle2) this.dom.creditsGroupTitle2.textContent = AppConfig.POPUP_TEXTS.CREDITS_GROUP_2_TITLE;
        this._populateList(this.dom.creditsList2, AppConfig.POPUP_TEXTS.CREDITS_GROUP_2_LIST);

        if(this.dom.creditsGroupTitle3) this.dom.creditsGroupTitle3.textContent = AppConfig.POPUP_TEXTS.CREDITS_GROUP_3_TITLE;
        this._populateList(this.dom.creditsList3, AppConfig.POPUP_TEXTS.CREDITS_GROUP_3_LIST);

        if(this.dom.creditsCopyright) this.dom.creditsCopyright.innerHTML = AppConfig.POPUP_TEXTS.CREDITS_COPYRIGHT;


        this.secondaryContentLoaded = true; // Mark as loaded.
    }

    /**
     * Shows the information popup.
     * Resets scroll position, ensures content is loaded, and manages visibility and ARIA attributes.
     * Starts observing animatable elements for scroll-triggered animations.
     */
    showInfoPopup() {
        if (!this.dom.infoPopup || !this.dom.infoPopupContentWrapper) return;

        this.dom.infoPopupContentWrapper.scrollTop = 0; // Scroll to top.
        this._ensureSecondaryPopupContentLoaded(); // Make sure all text content is populated.

        // Reset animation classes and start observing for scroll animations.
        this.animatablePopupElements.forEach(el => {
            if (el) {
                el.classList.remove('scroll-animate--in-view');
                // Force reflow to help ensure CSS transitions re-trigger correctly if re-shown.
                void el.offsetWidth; 
                
                if (this.popupScrollObserver) {
                    this.popupScrollObserver.observe(el); // Start observing this element.
                } else { // Fallback if IntersectionObserver is not supported
                    el.classList.add('scroll-animate--in-view'); // Make visible immediately.
                }
            }
        });
        
        // Make content blocks visible (these might have been display:none).
        // Note: CSS animations/transitions might handle the actual visual appearance.
        if (this.dom.infoPopupInitialTitleContainer) this.dom.infoPopupInitialTitleContainer.style.display = 'block';
        if (this.dom.infoPopupSecondaryContentContainer) {
            this.dom.infoPopupSecondaryContentContainer.setAttribute('aria-hidden', 'false');
            this.dom.infoPopupSecondaryContentContainer.style.display = 'block';
        }
         if (this.dom.stickyHeaderContent) { // Ensure sticky header is also display: block (or its original display type).
            this.dom.stickyHeaderContent.style.display = 'block'; // or 'flex', etc. depending on its CSS
        }
        if (this.dom.contentBlock1) {
            this.dom.contentBlock1.setAttribute('aria-hidden', 'false');
            this.dom.contentBlock1.style.display = 'block';
        }
        if (this.dom.contentBlock2) {
            this.dom.contentBlock2.setAttribute('aria-hidden', 'false');
            this.dom.contentBlock2.style.display = 'block';
        }
        if (this.dom.contentBlock3) {
            this.dom.contentBlock3.setAttribute('aria-hidden', 'false');
            this.dom.contentBlock3.style.display = 'block';
        }

        // Show the main popup and hide the trigger button.
        this.dom.infoPopup.setAttribute('aria-hidden', 'false');
        if (this.dom.infoPopupTriggerBtn) this.dom.infoPopupTriggerBtn.style.visibility = 'hidden';
    }

    /**
     * Hides the information popup.
     * Updates visibility and ARIA attributes. Stops observing animatable elements.
     */
    hideInfoPopup() {
        if (!this.dom.infoPopup) return;
        this.dom.infoPopup.setAttribute('aria-hidden', 'true');
        if (this.dom.infoPopupTriggerBtn) this.dom.infoPopupTriggerBtn.style.visibility = 'visible';

        // Stop observing and reset animation classes for elements within the popup.
        if (this.popupScrollObserver) {
            this.animatablePopupElements.forEach(el => {
                if (el) {
                    this.popupScrollObserver.unobserve(el);
                    el.classList.remove('scroll-animate--in-view');
                }
            });
        }
    }
}

// PART 4: Utility Functions
// -------------------------
// A collection of general-purpose helper functions.

/**
 * @namespace Utils
 * A collection of static utility functions.
 */
const Utils = {
    /**
     * Converts a HEX color string to an RGB object.
     * @param {string} hex - The HEX color string (e.g., "#FF0000" or "FF0000").
     * @returns {{r: number, g: number, b: number}} An object with r, g, b properties (0-255).
     */
    hexToRgb: (hex) => {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return { r, g, b };
    },
    /**
     * Easing function for smooth animations (cubic ease-in-out).
     * @param {number} t - The input time/progress, typically from 0 to 1.
     * @returns {number} The eased value, also from 0 to 1.
     */
    easeInOutCubic: (t) => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
};
Object.freeze(Utils); // Make the Utils object immutable.

// PART 5: Application Configuration
// ---------------------------------
// Centralized configuration settings for the application.

/**
 * @namespace AppConfig
 * Static configuration object for the application.
 * Contains settings for p5.js canvas, flower geometry, colors,
 * initial parameters, auto-animation, popup text, audio files, and slider definitions.
 * All properties are frozen to prevent accidental modification.
 */
const AppConfig = {
    /** @type {string} ID of the HTML element that will contain the p5.js canvas. */
    P5_CANVAS_ID: 'canvas-container',
    /**
     * @type {object} Configuration for the Flower's geometry and rendering.
     * @property {number} cols - Number of columns (segments around the flower's circumference).
     * @property {number} rows - Number of rows (segments from center to edge of petals).
     * @property {number} flowerSize - Base size of the flower.
     * @property {number} alphaValue - Alpha transparency for the flower's fill color (0-255).
     * @property {number} frameRate - Target frame rate for the p5.js sketch.
     */
    FLOWER_CONFIG: {
        cols: 80,
        rows: 6,
        flowerSize: 200,
        alphaValue: 247,
        frameRate: 30,
    },
    /** @type {number} Factor affecting the angular spread of petals. */
    THETA_DELTA_FACTOR: 15,
    /** @type {number} Factor affecting the radial spread of petal segments. */
    RADIUS_DELTA_FACTOR: 1,
    /** @type {string[]} Array of HEX color strings for the flower's color palette. */
    COLOR_SCHEME: ["#FFD200", "#FF7192", "#FF0066"],
    /** @type {string} Background color for the light theme (HEX). */
    COLOR_SCHEME_LIGHT_BG: '#F5F5F5',
    /** @type {string} Background color for the dark theme (HEX). */
    COLOR_SCHEME_DARK_BG: '#0F0F0F',
    /**
     * @type {object} Initial parameter values for the flower.
     * @property {number} opening - Controls the overall openness of the flower.
     * @property {number} density - Controls the vertical density/tightness of petals.
     * @property {number} align - Affects petal alignment and overlap.
     * @property {number} curve1 - Primary curvature factor for petals.
     * @property {number} curve2 - Secondary curvature factor for petals.
     * @property {number} rotationSpeed - Initial auto-rotation speed of the flower.
     */
    INITIAL_PARAMS: {
        opening: 0.8,
        density: 5.5,
        align: 3.2,
        curve1: -0.7,
        curve2: 0.9,
        rotationSpeed: 0.01
    },
    /**
     * @type {object} Configuration for auto-animation of flower parameters.
     * @property {number} LERP_FACTOR - Interpolation factor for smooth transitions in auto-animation.
     * @property {number} PERLIN_OFFSET_MULTIPLIER - Offset for Perlin noise to differentiate parameter animations.
     * @property {number} PERLIN_NOISE_SPEED - Speed at which Perlin noise evolves over time.
     */
    AUTO_ANIMATION: {
        LERP_FACTOR: 0.02,
        PERLIN_OFFSET_MULTIPLIER: 20,
        PERLIN_NOISE_SPEED: 0.003,
    },
    /**
     * @type {object} Text content for the information popup.
     * Includes titles, headings, quotes, paragraphs, and credits.
     */
    POPUP_TEXTS: {
        INITIAL_TITLE: "The Better Way Forward.",
        SECONDARY_HEADING: "Peace, Justice, Strong Institutions",
        SECONDARY_SUBHEADING: "SDG Goal 16",
        QUOTE: "'Peace is not just the absence of conflict, peace is the creation of an environment where all can flourish, regardless of race, colour, creed, religion, gender, class, caste, or any other social markers of difference.'",
        ATTRIBUTION: "Global Convention on Peace and Nonviolence in New Delhi, India, on January 31, 2004.",
        ADDITIONAL_PARAGRAPH: "Nelson Mandela's quote aligns strongly with Sustainable Development Goal 16, which promotes peace, justice, and strong institutions. True peace is not just the absence of conflict, but the presence of fairness, inclusion, and human dignity. Lasting peace is built on justice and upheld through trust and responsibility.",
        CALL_TO_ACTION: "Let’s commit to societies where everyone can thrive, ensuring lasting peace!",
        CREDITS_GROUP_1_TITLE: "(BuBiehkslulu)",
        CREDITS_GROUP_1_LIST: ["Le Mac Thien Phuc", "Pham Minh Trang", "Tran Huy Toan"],
        CREDITS_GROUP_2_TITLE: "(Software Used)",
        CREDITS_GROUP_2_LIST: ["Visual Studio", "Adobe Photoshop", "Adobe After Effect"],
        CREDITS_GROUP_3_TITLE: "(Software Used)", // Note: Duplicated group title in original, might be intended for different categories or a typo.
        CREDITS_GROUP_3_LIST: ["Visual Studio", "Adobe Photoshop", "Adobe After Effect", "Adobe Illustrator", "Garage Band", "FL Studio", "BandLab"],
        CREDITS_COPYRIGHT: "BuBiehkslulu © 2025. All Right Reserved."
    },
    /**
     * @type {object} IDs for HTML audio elements.
     * @property {string} BACKGROUND_MUSIC_ID - ID of the background music <audio> tag.
     * @property {string} CLICK_SOUND_ID - ID of the click sound <audio> tag.
     */
    AUDIO_FILES: {
        BACKGROUND_MUSIC_ID: 'backgroundMusic',
        CLICK_SOUND_ID: 'clickSound'
    },
    /**
     * @type {Array<object>} Definitions for UI sliders controlling flower parameters.
     * Each object defines `param` (key in `INITIAL_PARAMS`), `label` for UI, `min`, `max`, `step` for slider,
     * and `decimals` for display formatting.
     */
    SLIDER_DEFINITIONS: [
        { param: 'opening', label: 'Flower Opening:', min: 0.5, max: 1.3, step: 0.01, decimals: 2 },
        { param: 'density', label: 'Vertical Density:', min: 1, max: 20, step: 0.1, decimals: 1 },
        { param: 'align', label: 'Petal Alignment:', min: 0, max: 6, step: 0.01, decimals: 2 },
        { param: 'curve1', label: 'Primary Curves:', min: -0.7, max: 2.1, step: 0.05, decimals: 2 },
        { param: 'curve2', label: 'Secondary Curves:', min: 0.0, max: 1.5, step: 0.01, decimals: 2 },
        { param: 'rotationSpeed', label: 'Auto-Rotate Speed:', min: -0.5, max: 0.5, step: 0.01, decimals: 2 }
    ],
    /** @type {object} Placeholder for timeout delay configurations, currently empty. */
    TIMEOUT_DELAYS: {}
};

// Deep freeze the AppConfig object to make it truly immutable.
Object.freeze(AppConfig);
Object.freeze(AppConfig.FLOWER_CONFIG);
Object.freeze(AppConfig.INITIAL_PARAMS);
Object.freeze(AppConfig.AUTO_ANIMATION);
Object.freeze(AppConfig.POPUP_TEXTS);
Object.freeze(AppConfig.AUDIO_FILES);
AppConfig.SLIDER_DEFINITIONS.forEach(Object.freeze); // Freeze each slider definition object
Object.freeze(AppConfig.SLIDER_DEFINITIONS); // Freeze the array itself
Object.freeze(AppConfig.TIMEOUT_DELAYS);


// PART 6: Flower Class
// --------------------
// Defines the 3D flower, its geometry, appearance, and animation logic.

/**
 * @class Flower
 * Represents the 3D flower visualization.
 * Handles geometry generation, coloring, rendering, and parameter-driven transformations.
 */
class Flower {
    /**
     * Creates an instance of Flower.
     * @param {p5} p - The p5.js instance.
     * @param {object} config - Configuration object for flower properties (cols, rows, size, etc.).
     * @param {object} initialParams - Initial parameters controlling the flower's shape.
     * @param {string[]} colorScheme - Array of HEX color strings for the flower's palette.
     */
    constructor(p, config, initialParams, colorScheme) {
        /** @type {p5} The p5.js instance. */
        this.p = p;
        /** @type {object} Configuration settings for the flower, copied from AppConfig. */
        this.config = { ...config };
        /** @type {object} Current parameters determining the flower's shape and behavior. */
        this.params = { ...initialParams };
        /** @type {string[]} Original HEX color scheme. */
        this.colorScheme = [...colorScheme];
        /** @type {Array<object>} Array of face objects, each defining a triangle with vertices and color. */
        this.faces = [];
        /** @type {number} Current rotation angle around the Y-axis. */
        this.rotationAngle = 0;

        /** @type {number} Angular step between columns of vertices (in degrees). */
        this.thetaDelta = (180 * AppConfig.THETA_DELTA_FACTOR) / this.config.cols;
        /** @type {number} Radial step between rows of vertices. */
        this.radiusDelta = AppConfig.RADIUS_DELTA_FACTOR / this.config.rows;
        /** @type {number} Pre-calculated thetaDelta in radians for efficiency. */
        this.precalculatedThetaDeltaRad = this.p.radians(this.thetaDelta);

        /** @type {Array<{r: number, g: number, b: number}>} Processed color palette (RGB, 0-1 range). */
        this.palette = this.colorScheme.map(hex => {
            const rgb = Utils.hexToRgb(hex);
            return { r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 }; // Normalized 0-1 for lerping.
        });

        this.regenerateGeometry(); // Initial geometry generation.
    }

    /**
     * Updates the flower's parameters.
     * If parameters affecting geometry (not 'rotationSpeed') change, it triggers regeneration.
     * @param {object} newParams - An object containing new parameter values to apply.
     */
    updateParams(newParams) {
        let needsRegeneration = false;
        for (const key in newParams) {
            if (this.params.hasOwnProperty(key) && this.params[key] !== newParams[key]) {
                this.params[key] = newParams[key];
                // If any parameter other than rotationSpeed changes, geometry needs to be recalculated.
                if (key !== 'rotationSpeed') {
                    needsRegeneration = true;
                }
            }
        }
        if (needsRegeneration) {
            this.regenerateGeometry();
        }
    }

    /**
     * Calculates the phi angle (inclination from vertical) for a petal segment.
     * This angle is influenced by the `opening` and `density` parameters.
     * @param {number} thetaIdx - The column index (angular position).
     * @returns {number} The calculated phi angle in degrees.
     * @private
     */
    _calculatePhi(thetaIdx) {
        return (180 / this.params.opening) * this.p.exp(-thetaIdx * this.thetaDelta / (this.params.density * 180));
    }

    /**
     * Calculates a factor that shapes the petal's edge, creating a "cut" or profile.
     * Influenced by the `align` parameter, it creates periodic variations.
     * @param {number} thetaIdx - The column index (angular position).
     * @returns {number} A shaping factor, typically between 0 and 1.
     * @private
     */
    _calculatePetalShape(thetaIdx) {
        let petalProgress = (this.params.align * thetaIdx * this.thetaDelta % 360) / 180;
        // Complex formula to create a specific petal edge shape.
        return 1 - (0.5) * this.p.pow((1.25) * this.p.pow(1 - petalProgress, 2) - 0.25, 2);
    }

    /**
     * Calculates the "hang down" or curvature amount for a point on a petal.
     * This is influenced by `curve1`, `curve2`, the normalized radius, and the phi angle.
     * @param {number} normalizedRadius - The radius normalized to a 0-1 range.
     * @param {number} phi - The phi angle (inclination) in degrees.
     * @returns {number} The calculated curvature value.
     * @private
     */
    _calculateCurvature(normalizedRadius, phi) {
        return this.params.curve1 * this.p.pow(normalizedRadius, 2) *
               this.p.pow(this.params.curve2 * normalizedRadius - 1, 2) *
               this.p.sin(this.p.radians(phi));
    }

    /**
     * Calculates the 3D Cartesian coordinates (x, y, z) of a vertex on the flower.
     * Based on spherical-like coordinates transformed by various shaping factors.
     * @param {number} normalizedRadius - Normalized distance from the center.
     * @param {number} phi - Inclination angle (degrees).
     * @param {number} hangDown - Curvature factor.
     * @param {number} thetaIdx - Azimuthal angle index.
     * @param {number} petalCut - Petal shaping factor.
     * @returns {{x: number, y: number, z: number}} The 3D coordinates.
     * @private
     */
    _calculate3DPosition(normalizedRadius, phi, hangDown, thetaIdx, petalCut) {
        const phiRad = this.p.radians(phi);
        const thetaRad = thetaIdx * this.precalculatedThetaDeltaRad; // Use pre-calculated radians

        // Standard spherical to Cartesian conversion, modified by petal shape and curvature.
        const sinPhi = this.p.sin(phiRad);
        const cosPhi = this.p.cos(phiRad);
        const sinTheta = this.p.sin(thetaRad);
        const cosTheta = this.p.cos(thetaRad);

        const radialFactor = normalizedRadius * sinPhi + hangDown * cosPhi;
        const currentFlowerSize = this.config.flowerSize;

        const x = currentFlowerSize * petalCut * radialFactor * sinTheta;
        const y = -currentFlowerSize * petalCut * (normalizedRadius * cosPhi - hangDown * sinPhi); // Y is up/down
        const z = currentFlowerSize * petalCut * radialFactor * cosTheta;
        return { x, y, z };
    }

    /**
     * Determines the color of a face (triangle) based on its depth (z-coordinate) and normalized radius.
     * Blends colors from the `palette` using an easing function for smooth transitions.
     * @param {object} faceInfo - Information about the face, including `z` and `normalizedRadius`.
     * @param {number} faceInfo.z - Average z-coordinate of the face's vertices.
     * @param {number} faceInfo.normalizedRadius - Normalized radial position of the face.
     * @returns {{r: number, g: number, b: number}} The blended RGB color (0-1 range).
     * @private
     */
    _getBlendedColor(faceInfo) {
        // Map z-coordinate and radius to factors for color blending.
        const depthFactor = this.p.map(faceInfo.z, -this.config.flowerSize * 0.8, this.config.flowerSize * 0.8, 0, 1, true);
        const radiusFactor = faceInfo.normalizedRadius;

        // Combine factors to determine a position in the color palette.
        let colorPosition = 0.6 * radiusFactor + 0.4 * depthFactor; // Weighted average
        colorPosition = Utils.easeInOutCubic(this.p.constrain(colorPosition, 0, 1)); // Apply easing

        // Map the eased position to indices in the palette for interpolation.
        colorPosition = this.p.constrain(colorPosition, 0, 0.999); // Avoid exceeding array bounds
        const mappedPosition = colorPosition * (this.palette.length - 1);
        const colorIndex = this.p.floor(mappedPosition);
        const nextColorIndex = this.p.min(colorIndex + 1, this.palette.length - 1);
        const blendFactor = mappedPosition - colorIndex; // Factor for lerping

        const c1 = this.palette[colorIndex];
        const c2 = this.palette[nextColorIndex];

        // Linearly interpolate between the two selected palette colors.
        return {
            r: this.p.lerp(c1.r, c2.r, blendFactor),
            g: this.p.lerp(c1.g, c2.g, blendFactor),
            b: this.p.lerp(c1.b, c2.b, blendFactor)
        };
    }

    /**
     * Regenerates the flower's geometry (vertices and faces) based on current parameters.
     * This is called when parameters affecting shape are changed.
     */
    regenerateGeometry() {
        // Basic validation to prevent errors if params are somehow invalid
        if (Object.values(this.params).some(v => isNaN(parseFloat(v)))) {
            console.warn("Invalid flower parameter detected, skipping regeneration:", this.params);
            return;
        }
        this.faces = []; // Clear existing faces.
        const verticesGrid = []; // 2D array to store calculated vertices: [row][col]

        // Calculate all vertex positions.
        for (let r = 0; r <= this.config.rows; r++) { // Iterate through rows (radial segments)
            verticesGrid.push([]);
            let normalizedRadius = r * this.radiusDelta;
            for (let thetaIdx = 0; thetaIdx <= this.config.cols; thetaIdx++) { // Iterate through columns (angular segments)
                let phi = this._calculatePhi(thetaIdx);
                let petalCut = this._calculatePetalShape(thetaIdx);
                let hangDown = this._calculateCurvature(normalizedRadius, phi);
                let point = this._calculate3DPosition(normalizedRadius, phi, hangDown, thetaIdx, petalCut);
                verticesGrid[r].push(point);
            }
        }

        // Create faces (triangles) from the grid of vertices.
        // Each quad in the grid is split into two triangles.
        for (let r = 0; r < this.config.rows; r++) {
            for (let thetaIdx = 0; thetaIdx < this.config.cols; thetaIdx++) {
                const v1 = verticesGrid[r][thetaIdx];         // Top-left
                const v2 = verticesGrid[r][thetaIdx + 1];     // Top-right
                const v3 = verticesGrid[r + 1][thetaIdx + 1]; // Bottom-right
                const v4 = verticesGrid[r + 1][thetaIdx];     // Bottom-left

                // Information for coloring, based on average z and radius of the triangle.
                const faceInfo1 = {
                    normalizedRadius: r * this.radiusDelta, // Use radius of the 'r' row
                    z: (v1.z + v2.z + v4.z) / 3.0 // Average Z of the first triangle
                };
                const faceInfo2 = {
                    normalizedRadius: (r + 0.5) * this.radiusDelta, // Use mid-radius between 'r' and 'r+1' rows
                    z: (v2.z + v3.z + v4.z) / 3.0 // Average Z of the second triangle
                };

                const color1 = this._getBlendedColor(faceInfo1);
                const color2 = this._getBlendedColor(faceInfo2);

                // Add two triangles to form a quad.
                this.faces.push({ v1: v1, v2: v2, v3: v4, color: color1 }); // Triangle 1 (v1, v2, v4)
                this.faces.push({ v1: v2, v2: v3, v3: v4, color: color2 }); // Triangle 2 (v2, v3, v4)
            }
        }
    }

    /**
     * Displays the flower in the p5.js canvas.
     * Applies rotation and renders all faces (triangles) with their calculated colors.
     */
    display() {
        this.p.push(); // Save current drawing style and transformation matrix.
        this.p.rotateY(this.rotationAngle); // Apply rotation.

        // Update rotation angle if auto-rotation is active.
        if (this.params.rotationSpeed !== 0 ) {
            this.rotationAngle += this.params.rotationSpeed * 0.02; // Adjust multiplier for desired speed sensitivity.
        }

        this.p.noStroke(); // No outlines for the triangles.
        // Render each face of the flower.
        for (const face of this.faces) {
            const c = face.color;
            this.p.fill(c.r * 255, c.g * 255, c.b * 255, this.config.alphaValue); // Set fill color and alpha.
            this.p.beginShape(this.p.TRIANGLES); // Start drawing a triangle.
            this.p.vertex(face.v1.x, face.v1.y, face.v1.z);
            this.p.vertex(face.v2.x, face.v2.y, face.v2.z);
            this.p.vertex(face.v3.x, face.v3.y, face.v3.z);
            this.p.endShape(this.p.CLOSE); // End drawing.
        }
        this.p.pop(); // Restore previous drawing style and transformation matrix.
    }

    /**
     * Automatically animates flower parameters using Perlin noise.
     * Lerps current parameters towards target values derived from noise.
     * Triggers geometry regeneration if shape parameters change significantly.
     * @param {number} time - A time value (e.g., incrementing frame count or UIManager's animationTime) to drive Perlin noise.
     * @returns {object} The updated parameters object.
     */
    autoAnimateParams(time) {
        const automatableParams = AppConfig.SLIDER_DEFINITIONS.map(def => def.param);
        let needsRegeneration = false;
        let newParams = { ...this.params }; // Work with a copy to calculate new state.

        automatableParams.forEach((paramName, index) => {
            const sliderDef = AppConfig.SLIDER_DEFINITIONS.find(def => def.param === paramName);
            if (sliderDef) {
                const minVal = sliderDef.min;
                const maxVal = sliderDef.max;
                // Generate Perlin noise value (0-1 range).
                // Offset by index to make each parameter's animation slightly different.
                let noiseVal = this.p.noise(time + index * AppConfig.AUTO_ANIMATION.PERLIN_OFFSET_MULTIPLIER);
                // Map noise value to the parameter's allowed range [minVal, maxVal].
                let targetValue = this.p.map(noiseVal, 0, 1, minVal, maxVal);

                // Smoothly interpolate (lerp) current parameter towards the target value.
                newParams[paramName] = this.p.lerp(this.params[paramName], targetValue, AppConfig.AUTO_ANIMATION.LERP_FACTOR);
                // Ensure the new value stays within defined bounds.
                newParams[paramName] = this.p.constrain(newParams[paramName], minVal, maxVal);

                // Check if a geometry-affecting parameter has changed enough to warrant regeneration.
                if (paramName !== 'rotationSpeed' && Math.abs(this.params[paramName] - newParams[paramName]) > 0.0001) {
                    needsRegeneration = true;
                }
            }
        });

        this.params = newParams; // Apply the newly calculated parameters.
        if (needsRegeneration) {
            this.regenerateGeometry();
        }
        return this.params; // Return the updated params (useful for UIManager to update sliders).
    }
}