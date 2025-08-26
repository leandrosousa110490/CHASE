// Fantasy Football Draft Number Generator with DuckDB
import * as duckdb from '@duckdb/duckdb-wasm';
class FantasyDraftApp {
    constructor() {
        this.db = null;
        this.conn = null;
        this.usedNumbers = new Set();
        this.initializeApp();
    }
    async initializeApp() {
        try {
            await this.initializeDuckDB();
            await this.createTables();
            await this.loadExistingPlayers();
            this.setupEventListeners();
            console.log('Fantasy Draft App initialized successfully!');
        }
        catch (error) {
            console.error('Error initializing app:', error);
            this.showError('Failed to initialize the application. Please refresh the page.');
        }
    }
    async initializeDuckDB() {
        try {
            const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
            const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
            const worker_url = URL.createObjectURL(new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' }));
            const worker = new Worker(worker_url);
            const logger = new duckdb.ConsoleLogger();
            this.db = new duckdb.AsyncDuckDB(logger, worker);
            await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);
            this.conn = await this.db.connect();
        }
        catch (error) {
            console.error('Failed to initialize DuckDB:', error);
            throw new Error('Database initialization failed');
        }
    }
    async createTables() {
        if (!this.conn)
            throw new Error('Database connection not established');
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS draft_players (
                id INTEGER PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                draft_number INTEGER NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        try {
            await this.conn.query(createTableSQL);
            console.log('Database table created successfully');
        }
        catch (error) {
            console.error('Error creating table:', error);
            throw error;
        }
    }
    async loadExistingPlayers() {
        if (!this.conn)
            return;
        try {
            const result = await this.conn.query('SELECT * FROM draft_players ORDER BY draft_number');
            const players = result.toArray().map(row => ({
                id: row.id,
                name: row.name,
                draftNumber: row.draft_number,
                timestamp: row.timestamp
            }));
            // Update used numbers set
            this.usedNumbers.clear();
            players.forEach(player => this.usedNumbers.add(player.draftNumber));
            // Display players
            this.displayPlayersList(players);
        }
        catch (error) {
            console.error('Error loading existing players:', error);
        }
    }
    generateRandomDraftNumber() {
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
    async savePlayer(name, draftNumber) {
        if (!this.conn)
            throw new Error('Database connection not established');
        const insertSQL = `
            INSERT INTO draft_players (name, draft_number) 
            VALUES ('${name.replace(/'/g, "''")}', ${draftNumber})
        `;
        try {
            await this.conn.query(insertSQL);
            this.usedNumbers.add(draftNumber);
            console.log(`Player ${name} saved with draft number ${draftNumber}`);
        }
        catch (error) {
            console.error('Error saving player:', error);
            throw error;
        }
    }
    async assignDraftNumber() {
        const nameInput = document.getElementById('playerName');
        const playerName = nameInput.value.trim();
        if (!playerName) {
            this.showError('Please enter your name!');
            return;
        }
        // Check if name already exists
        if (await this.playerExists(playerName)) {
            this.showError('This name has already been assigned a draft number!');
            return;
        }
        this.showLoading(true);
        try {
            const draftNumber = this.generateRandomDraftNumber();
            await this.savePlayer(playerName, draftNumber);
            this.showResult(playerName, draftNumber);
            await this.loadExistingPlayers(); // Refresh the list
            nameInput.value = ''; // Clear input
        }
        catch (error) {
            console.error('Error assigning draft number:', error);
            this.showError(error instanceof Error ? error.message : 'Failed to assign draft number');
        }
        finally {
            this.showLoading(false);
        }
    }
    async playerExists(name) {
        if (!this.conn)
            return false;
        try {
            const result = await this.conn.query(`SELECT COUNT(*) as count FROM draft_players WHERE LOWER(name) = LOWER('${name.replace(/'/g, "''")}')`);
            const count = result.toArray()[0]?.count || 0;
            return count > 0;
        }
        catch (error) {
            console.error('Error checking player existence:', error);
            return false;
        }
    }
    async clearAllPlayers() {
        if (!this.conn)
            return;
        if (!confirm('Are you sure you want to clear all players? This cannot be undone.')) {
            return;
        }
        try {
            await this.conn.query('DELETE FROM draft_players');
            this.usedNumbers.clear();
            await this.loadExistingPlayers();
            this.showInputForm();
            console.log('All players cleared');
        }
        catch (error) {
            console.error('Error clearing players:', error);
            this.showError('Failed to clear players');
        }
    }
    displayPlayersList(players) {
        const playersListElement = document.getElementById('playersList');
        if (!playersListElement)
            return;
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
        if (playerNameDisplay)
            playerNameDisplay.textContent = `Hello, ${playerName}!`;
        if (draftNumberDisplay)
            draftNumberDisplay.textContent = draftNumber.toString();
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
        }
        else {
            this.hideElement('loading');
        }
    }
    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage)
            errorMessage.textContent = message;
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
        if (element)
            element.style.display = 'block';
    }
    hideElement(id) {
        const element = document.getElementById(id);
        if (element)
            element.style.display = 'none';
    }
    setupEventListeners() {
        // Get draft number button
        const getDraftButton = document.getElementById('getDraftNumber');
        if (getDraftButton) {
            getDraftButton.addEventListener('click', () => this.assignDraftNumber());
        }
        // New player button
        const newPlayerButton = document.getElementById('newPlayer');
        if (newPlayerButton) {
            newPlayerButton.addEventListener('click', () => this.showInputForm());
        }
        // Clear all button
        const clearAllButton = document.getElementById('clearAll');
        if (clearAllButton) {
            clearAllButton.addEventListener('click', () => this.clearAllPlayers());
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
    new FantasyDraftApp();
});
// Export for potential external use
export { FantasyDraftApp };
//# sourceMappingURL=main.js.map