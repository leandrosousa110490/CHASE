// Fantasy Football Draft Number Generator - JSON Storage with 10 Player Limit
class FantasyDraftApp {
    constructor() {
        this.storageKey = 'fantasyDraftPlayers';
        this.maxPlayers = 10;
        this.players = [];
        this.usedNumbers = new Set();
        this.initializeApp();
    }

    initializeApp() {
        console.log('Initializing Fantasy Draft App with JSON storage...');
        this.loadPlayersFromURL(); // Load from URL first
        this.loadPlayersFromJSON(); // Then load from localStorage if URL empty
        this.setupEventListeners();
        console.log('Fantasy Draft App initialized successfully!');
    }

    loadPlayersFromURL() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const encodedData = urlParams.get('data');
            
            if (encodedData) {
                const decodedData = atob(encodedData);
                const sharedPlayers = JSON.parse(decodedData);
                
                if (Array.isArray(sharedPlayers) && sharedPlayers.length > 0) {
                    this.players = sharedPlayers;
                    this.usedNumbers.clear();
                    this.players.forEach(player => this.usedNumbers.add(player.draftNumber));
                    
                    // Save to localStorage as backup
                    this.savePlayersToJSON();
                    
                    console.log('Loaded players from shared URL:', this.players.length);
                    this.displayPlayersList(this.players);
                    
                    // Show notification that shared data was loaded
                    setTimeout(() => {
                        this.showSuccess(`Loaded shared draft with ${this.players.length} players!`);
                    }, 1000);
                    
                    return true; // Successfully loaded from URL
                }
            }
        } catch (error) {
            console.error('Error loading players from URL:', error);
        }
        return false; // No data loaded from URL
    }

    loadPlayersFromJSON() {
        // Only load from localStorage if we don't already have players from URL
        if (this.players.length > 0) {
            return;
        }
        
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.players = JSON.parse(stored);
                console.log('Loaded players from localStorage:', this.players.length);
            } else {
                this.players = [];
                console.log('No existing players found, starting fresh');
            }
            
            // Update used numbers set
            this.usedNumbers.clear();
            this.players.forEach(player => this.usedNumbers.add(player.draftNumber));
            
            // Display players
            this.displayPlayersList(this.players);
        } catch (error) {
            console.error('Error loading players from JSON:', error);
            this.players = [];
            this.displayPlayersList(this.players);
        }
    }

    savePlayersToJSON() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.players));
            console.log('Players saved to JSON storage');
        } catch (error) {
            console.error('Error saving players to JSON:', error);
            this.showError('Failed to save player data');
        }
    }

    generateShareURL() {
        try {
            const encodedData = btoa(JSON.stringify(this.players));
            const baseURL = window.location.origin + window.location.pathname;
            return `${baseURL}?data=${encodedData}`;
        } catch (error) {
            console.error('Error generating share URL:', error);
            return null;
        }
    }

    shareResults() {
        if (this.players.length === 0) {
            this.showError('No players to share! Add some players first.');
            return;
        }

        const shareURL = this.generateShareURL();
        if (shareURL) {
            // Copy to clipboard if available
            if (navigator.clipboard) {
                navigator.clipboard.writeText(shareURL).then(() => {
                    this.showSuccess('Share URL copied to clipboard!');
                }).catch(() => {
                    this.showShareURL(shareURL);
                });
            } else {
                this.showShareURL(shareURL);
            }
        } else {
            this.showError('Failed to generate share URL');
        }
    }

    showSuccess(message) {
        // Create temporary success message
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed';
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
        alertDiv.innerHTML = `
            <strong>Success!</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 3000);
    }

    showShareURL(url) {
        const message = `Share this URL to let others see the draft results:\n\n${url}`;
        alert(message);
    }

    generateRandomDraftNumber() {
        // Check if we've reached the 10 player limit
        if (this.players.length >= this.maxPlayers) {
            throw new Error('Maximum 10 players allowed! Clear the list to start over.');
        }

        const availableNumbers = [];
        for (let i = 1; i <= 10; i++) {
            if (!this.usedNumbers.has(i)) {
                availableNumbers.push(i);
            }
        }

        if (availableNumbers.length === 0) {
            throw new Error('All draft numbers (1-10) have been assigned!');
        }

        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
        return availableNumbers[randomIndex];
    }

    savePlayer(name, draftNumber) {
        const player = {
            id: Date.now(),
            name: name,
            draftNumber: draftNumber,
            timestamp: new Date().toISOString()
        };
        
        this.players.push(player);
        this.usedNumbers.add(draftNumber);
        this.savePlayersToJSON();
        console.log(`Player ${name} saved with draft number ${draftNumber}`);
    }

    assignDraftNumber() {
        console.log('assignDraftNumber called!');
        const nameInput = document.getElementById('playerName');
        const playerName = nameInput.value.trim();

        if (!playerName) {
            this.showError('Please enter your name!');
            return;
        }

        // Check if name already exists
        if (this.playerExists(playerName)) {
            this.showError('This name has already been assigned a draft number!');
            return;
        }

        // Check player limit
        if (this.players.length >= this.maxPlayers) {
            this.showError(`Maximum ${this.maxPlayers} players allowed! Clear the list to add more.`);
            return;
        }

        this.showLoading(true);

        try {
            const draftNumber = this.generateRandomDraftNumber();
            this.savePlayer(playerName, draftNumber);
            this.showResult(playerName, draftNumber);
            this.displayPlayersList(this.players); // Refresh the list
            nameInput.value = ''; // Clear input
        } catch (error) {
            console.error('Error assigning draft number:', error);
            this.showError(error instanceof Error ? error.message : 'Failed to assign draft number');
        } finally {
            this.showLoading(false);
        }
    }

    playerExists(name) {
        return this.players.some(player => 
            player.name.toLowerCase() === name.toLowerCase()
        );
    }

    displayPlayersList(players) {
        const playersListElement = document.getElementById('playersList');
        const playerCountElement = document.getElementById('playerCount');
        const shareButton = document.getElementById('shareResults');
        
        // Update player count
        if (playerCountElement) {
            playerCountElement.textContent = `${players.length}/${this.maxPlayers} Players`;
            
            // Change color based on capacity
            if (players.length >= this.maxPlayers) {
                playerCountElement.className = 'badge bg-danger';
            } else if (players.length >= 7) {
                playerCountElement.className = 'badge bg-warning';
            } else {
                playerCountElement.className = 'badge bg-primary';
            }
        }
        
        // Show/hide share button based on player count
        if (shareButton) {
            shareButton.style.display = players.length > 0 ? 'inline-block' : 'none';
        }
        
        if (!playersListElement) return;

        if (players.length === 0) {
            playersListElement.innerHTML = '<p class="text-muted">No players assigned yet...</p>';
            return;
        }

        const playersHtml = players
            .sort((a, b) => a.draftNumber - b.draftNumber)
            .map(player => `
                <div class="player-item">
                    <div>
                        <strong>${this.escapeHtml(player.name)}</strong>
                        <small class="text-muted d-block">
                            ${new Date(player.timestamp).toLocaleString()}
                        </small>
                    </div>
                    <div class="draft-position">${player.draftNumber}</div>
                </div>
            `).join('');

        playersListElement.innerHTML = playersHtml;
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    showResult(playerName, draftNumber) {
        const playerNameDisplay = document.getElementById('playerNameDisplay');
        const draftNumberDisplay = document.getElementById('draftNumber');
        
        if (playerNameDisplay) playerNameDisplay.textContent = `Hello, ${playerName}!`;
        if (draftNumberDisplay) draftNumberDisplay.textContent = draftNumber.toString();

        this.hideAllSections();
        this.showElement('resultDisplay');
    }

    showInputForm() {
        this.hideAllSections();
        this.showElement('inputForm');
    }

    showLoading(show) {
        if (show) {
            this.hideAllSections();
            this.showElement('loading');
        } else {
            this.hideElement('loading');
        }
    }

    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) errorMessage.textContent = message;
        this.showElement('errorDisplay');
        
        // Auto-hide error after 5 seconds
        setTimeout(() => {
            this.hideElement('errorDisplay');
        }, 5000);
    }

    hideAllSections() {
        this.hideElement('inputForm');
        this.hideElement('resultDisplay');
        this.hideElement('loading');
        this.hideElement('errorDisplay');
    }

    showElement(id) {
        const element = document.getElementById(id);
        if (element) element.style.display = 'block';
    }

    hideElement(id) {
        const element = document.getElementById(id);
        if (element) element.style.display = 'none';
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Get draft number button
        const getDraftButton = document.getElementById('getDraftNumber');
        if (getDraftButton) {
            getDraftButton.addEventListener('click', () => {
                console.log('Button clicked!');
                this.assignDraftNumber();
            });
            console.log('Draft button listener added');
        } else {
            console.error('getDraftNumber button not found!');
        }

        // New player button
        const newPlayerButton = document.getElementById('newPlayer');
        if (newPlayerButton) {
            newPlayerButton.addEventListener('click', () => this.showInputForm());
        }

        // Share results button
        const shareButton = document.getElementById('shareResults');
        if (shareButton) {
            shareButton.addEventListener('click', () => this.shareResults());
        }

        // Enter key support for name input
        const nameInput = document.getElementById('playerName');
        if (nameInput) {
            nameInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    this.assignDraftNumber();
                }
            });
        }
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    window.fantasyApp = new FantasyDraftApp();
});