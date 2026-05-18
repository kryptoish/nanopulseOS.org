document.addEventListener('DOMContentLoaded', () => {
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('section');
    const startEmulatorBtn = document.getElementById('start-emulator-btn');
    const stopEmulatorBtn = document.getElementById('stop-emulator-btn');
    
    let emulator = null;

    // Tab Navigation
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            navBtns.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active-section'));

            // Add active class to clicked button and target section
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active-section');
        });
    });

    // Emulator Logic
    function startEmulator() {
        if (!emulator) {
            try {
                emulator = new window.V86({
                    wasm_path: "v86.wasm",
                    memory_size: 32 * 1024 * 1024,
                    vga_memory_size: 2 * 1024 * 1024,
                    screen_container: document.getElementById("emulator-screen"),
                    bios: {
                        url: "seabios.bin",
                    },
                    vga_bios: {
                        url: "vgabios.bin",
                    },
                    cdrom: {
                        url: "nanopulseos.iso",
                    },
                    autostart: true,
                });

                startEmulatorBtn.style.display = 'none';
                stopEmulatorBtn.style.display = 'inline-block';
            } catch (err) {
                console.error("Emulator init failed:", err);
                alert("Failed to initialize emulator. Check console for details.");
            }
        }
    }

    function stopEmulator() {
        if (emulator) {
            emulator.destroy();
            emulator = null;
            document.getElementById("emulator-screen").innerHTML = ''; // Clear canvas
            
            startEmulatorBtn.style.display = 'inline-block';
            stopEmulatorBtn.style.display = 'none';
        }
    }

    startEmulatorBtn.addEventListener('click', startEmulator);
    stopEmulatorBtn.addEventListener('click', stopEmulator);
});