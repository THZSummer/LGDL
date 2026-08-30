import * as fs from 'fs/promises';
import * as path from 'path';
import { constants as fsConstants } from 'fs';
import { scanTreeStructure } from './tree-scanner';
import { validateStateV3, VALID_STATUSES, } from './schema-v3.0.0';
export class StateLoader {
    cache = new Map();
    cacheExpiryMs = 3000; // 3 seconds
    specRootDir;
    constructor(specRootDir = '.sddu/specs-tree-root') {
        this.specRootDir = specRootDir;
    }
    /**
     * Loads all distributed states using the tree scanner
     * Returns a Map where keys are feature paths and values are their states
     */
    async loadAll() {
        const result = new Map();
        const scanResult = await scanTreeStructure(this.specRootDir);
        const flatMap = scanResult.flatMap;
        for (const [featurePath, _] of flatMap) {
            // Extract the expected state file path for this feature
            const stateFilePath = path.join(this.specRootDir, featurePath, 'state.json');
            let fileExists = false;
            try {
                await fs.access(stateFilePath, fsConstants.F_OK);
                fileExists = true;
            }
            catch {
                // File does not exist
            }
            if (fileExists) {
                try {
                    const stateDataContent = await fs.readFile(stateFilePath, 'utf8');
                    const stateData = JSON.parse(stateDataContent);
                    // Verify the state against our v3.0.0 schema
                    if (validateStateV3(stateData)) {
                        result.set(featurePath, stateData);
                        // Update cache
                        this.cache.set(featurePath, {
                            state: stateData,
                            timestamp: Date.now()
                        });
                    }
                    else {
                        console.warn(`Invalid state found at ${stateFilePath}, skipping`);
                        // Still add to cache but with null to avoid repeated validations
                        this.cache.set(featurePath, {
                            state: null,
                            timestamp: Date.now()
                        });
                    }
                }
                catch (error) {
                    console.error(`Error loading state from ${stateFilePath}: ${error.message}`);
                    this.cache.set(featurePath, {
                        state: null,
                        timestamp: Date.now()
                    });
                }
            }
            else {
                // State file doesn't exist, cache this info as well
                this.cache.set(featurePath, {
                    state: null,
                    timestamp: Date.now()
                });
            }
        }
        return result;
    }
    /**
     * Gets the state for a specific feature
     * Uses cache with 3-second expiry
     * - Reads v3.0.0 format; provides basic compatibility reads for legacy formats
     * - Applies automatic fixes for common schema issues
     */
    async get(featurePath) {
        // Check cache first
        const cached = this.cache.get(featurePath);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiryMs) {
            return cached.state;
        }
        // Cache expired or not available, load fresh
        const stateFilePath = path.join(this.specRootDir, featurePath, 'state.json');
        let fileExists = false;
        try {
            await fs.access(stateFilePath, fsConstants.F_OK);
            fileExists = true;
        }
        catch {
            // File does not exist
        }
        if (!fileExists) {
            this.cache.set(featurePath, {
                state: null,
                timestamp: Date.now()
            });
            return null;
        }
        try {
            const stateDataContent = await fs.readFile(stateFilePath, 'utf8');
            let stateData = JSON.parse(stateDataContent);
            // Apply validation and fix common issues if the state contains known issues
            if (this.stateHasIssues(stateData, featurePath)) {
                const repairedResult = await this.applyReparation(stateData, featurePath);
                stateData = repairedResult.state;
                if (repairedResult.fixedSomeIssues) {
                    console.warn(`WARNING: Automatic repair(s) applied to state in ${featurePath}:`, repairedResult.messages);
                }
            }
            if (validateStateV3(stateData)) {
                this.cache.set(featurePath, {
                    state: stateData,
                    timestamp: Date.now()
                });
                return stateData;
            }
            else {
                // Still add to cache but return anyway for recovery
                console.warn(`State found at ${stateFilePath} doesn't fully validate v3.0.0, returning anyway for recovery`);
                this.cache.set(featurePath, {
                    state: stateData,
                    timestamp: Date.now()
                });
                return stateData;
            }
        }
        catch (error) {
            console.error(`Error loading state from ${stateFilePath}: ${error.message}`);
            this.cache.set(featurePath, {
                state: null,
                timestamp: Date.now()
            });
            return null;
        }
    }
    stateHasIssues(state, featurePath) {
        // Check for the most critical common issues
        return (
        // Version issues - not v3.0.0
        (state.version && typeof state.version === 'string' && state.version !== 'v3.0.0') ||
            // Critical missing fields
            !state.version ||
            !state.feature ||
            !state.phase ||
            !state.status ||
            typeof state.depth !== 'number' ||
            !state.phaseHistory ||
            !Array.isArray(state.phaseHistory) ||
            !state.files ||
            !state.dependencies ||
            // Phase history missing when phase is beyond registered
            (typeof state.phase === 'string' && state.phase !== 'registered' && Array.isArray(state.phaseHistory) && state.phaseHistory.length === 0));
    }
    async applyReparation(state, featurePath) {
        const repairs = [];
        // Create a copy of the state for modification
        let repairedState = { ...state };
        // Fix version - ensure v3.0.0
        if (repairedState.version && repairedState.version !== 'v3.0.0') {
            repairedState.version = 'v3.0.0';
            repairs.push(`Fixed version from '${state.version}' to 'v3.0.0'`);
        }
        else if (!repairedState.version) {
            repairedState.version = 'v3.0.0';
            repairs.push(`Added missing 'version' as 'v3.0.0'`);
        }
        // Fix missing feature field
        if (!repairedState.feature) {
            repairedState.feature = featurePath ? path.basename(featurePath) : 'unknown';
            repairs.push(`Added missing feature field from path`);
        }
        // Fix phase — default to 'registered' if missing or invalid
        if (typeof repairedState.phase !== 'string' || !repairedState.phase) {
            // Try to infer from old 'state' field if present
            if (state.state && typeof state.state === 'string') {
                repairedState.phase = this.inferPhaseFromOldState(state.state);
                repairs.push(`Inferred phase '${repairedState.phase}' from old 'state' field: '${state.state}'`);
            }
            else {
                repairedState.phase = 'registered';
                repairs.push(`Added default phase 'registered'`);
            }
        }
        // FR-008: Fix status — only set default 'tracked' if status is missing or invalid
        // Do NOT overwrite existing non-tracked statuses (suspended/terminated/merged/completed)
        if (typeof repairedState.status !== 'string' || !repairedState.status) {
            repairedState.status = 'tracked';
            repairs.push(`Added default status 'tracked'`);
        }
        else if (!VALID_STATUSES.includes(repairedState.status)) {
            // If status is invalid, only then set to tracked
            repairs.push(`Status '${repairedState.status}' is invalid, defaulting to 'tracked'`);
            repairedState.status = 'tracked';
        }
        // NOTE: If status is already suspended/terminated/merged/completed, we preserve it (FR-008)
        // Fix depth
        if (typeof repairedState.depth !== 'number') {
            repairedState.depth = this.computeDepth(featurePath || '');
            repairs.push(`Added computed depth ${repairedState.depth}`);
        }
        // Fix phaseHistory
        if (!Array.isArray(repairedState.phaseHistory)) {
            repairedState.phaseHistory = [];
            repairs.push(`Initialized phaseHistory array`);
        }
        // Fix files
        if (!repairedState.files || typeof repairedState.files !== 'object') {
            const basename = featurePath ? path.basename(featurePath) : 'unknown';
            repairedState.files = { spec: `${basename}/spec.md` };
            repairs.push(`Added default minimal files definition`);
        }
        // Fix dependencies
        if (!repairedState.dependencies || typeof repairedState.dependencies !== 'object') {
            repairedState.dependencies = {
                on: (state.dependencies && Array.isArray(state.dependencies.on)) ? [...state.dependencies.on] : [],
                blocking: (state.dependencies && Array.isArray(state.dependencies.blocking)) ? [...state.dependencies.blocking] : [],
            };
            repairs.push(`Added default dependencies object`);
        }
        else {
            if (!Array.isArray(repairedState.dependencies.on)) {
                repairedState.dependencies.on = [];
                repairs.push(`Fixed dependencies.on to be empty array`);
            }
            if (!Array.isArray(repairedState.dependencies.blocking)) {
                repairedState.dependencies.blocking = [];
                repairs.push(`Fixed dependencies.blocking to be empty array`);
            }
        }
        // Fill phaseHistory if phase is beyond registered but history is empty
        if (repairedState.phase !== 'registered' && Array.isArray(repairedState.phaseHistory) && repairedState.phaseHistory.length === 0) {
            repairedState.phaseHistory.push({
                phase: repairedState.phase,
                timestamp: new Date().toISOString(),
                triggeredBy: 'StateLoader.fixMissingPhaseHistory'
            });
            repairs.push(`Added initial phase history entry for phase ${repairedState.phase} as required`);
        }
        return {
            state: repairedState,
            fixedSomeIssues: repairs.length > 0,
            messages: repairs
        };
    }
    /**
     * Infer a Phase value from an old-style 'state' field string.
     * Maps legacy status strings to the closest Phase equivalent.
     */
    inferPhaseFromOldState(oldState) {
        const mapping = {
            'drafting': 'registered',
            'discovered': 'discovered',
            'specified': 'specified',
            'planned': 'planned',
            'tasked': 'tasked',
            'building': 'builded',
            'implementing': 'builded',
            'reviewed': 'reviewed',
            'validated': 'validated',
            'completed': 'validated',
        };
        return mapping[oldState] || 'registered';
    }
    /**
     * Sets the state for a specific feature
     * Updates cache and writes to the distributed file
     */
    async set(featurePath, state) {
        if (!validateStateV3(state)) {
            console.error(`Invalid state provided for ${featurePath} — does not pass validateStateV3`);
            return false;
        }
        // Ensure the directory exists
        const stateFilePath = path.join(this.specRootDir, featurePath, 'state.json');
        const dirPath = path.dirname(stateFilePath);
        try {
            await fs.mkdir(dirPath, { recursive: true });
        }
        catch (error) {
            console.error(`Error creating directory ${dirPath}: ${error.message}`);
            return false;
        }
        try {
            // Write the new state to file
            await fs.writeFile(stateFilePath, JSON.stringify(state, null, 2));
            // Update cache
            this.cache.set(featurePath, {
                state,
                timestamp: Date.now()
            });
            return true;
        }
        catch (error) {
            console.error(`Error writing state to ${stateFilePath}: ${error.message}`);
            return false;
        }
    }
    /**
     * Creates a new state for a given feature if it doesn't already exist
     * - phase defaults to 'registered', status defaults to 'tracked'
     * - Automatically calculates depth based on featurePath
     * - Initializes phaseHistory with consistent strategy
     * - Calls validateStateV3 before writing
     */
    async create(featurePath, initialState) {
        const now = new Date().toISOString();
        // Compute depth automatically based on featurePath
        const computedDepth = this.computeDepth(featurePath);
        // Create complete state object with v3.0.0 defaults
        const completeInitialState = {
            // Required fields — providing default fallbacks if not in initialState
            feature: initialState.feature || path.basename(featurePath),
            name: initialState.name,
            version: 'v3.0.0', // 🆕 v3.0.0
            phase: initialState.phase || 'registered', // 🆕 default: registered
            status: initialState.status || 'tracked', // 🆕 default: tracked
            depth: initialState.depth ?? computedDepth,
            phaseHistory: this.initPhaseHistory(initialState, now),
            files: {
                spec: initialState.files?.spec || `${path.basename(featurePath)}/spec.md`,
                plan: initialState.files?.plan,
                tasks: initialState.files?.tasks,
                readme: initialState.files?.readme,
                review: initialState.files?.review,
                validation: initialState.files?.validation,
                discovery: initialState.files?.discovery,
            },
            dependencies: {
                on: initialState.dependencies?.on || [],
                blocking: initialState.dependencies?.blocking || []
            },
            childrens: initialState.childrens || [],
            metadata: initialState.metadata,
            history: initialState.history
        };
        // Validate before writing
        if (!validateStateV3(completeInitialState)) {
            throw new Error(`Created state for ${featurePath} fails validateStateV3()`);
        }
        const stateFilePath = path.join(this.specRootDir, featurePath, 'state.json');
        // Check if a state file already exists
        let fileExists = false;
        try {
            await fs.access(stateFilePath, fsConstants.F_OK);
            fileExists = true;
        }
        catch {
            // File doesn't exist, that's fine for create operation
        }
        if (fileExists) {
            console.error(`State file already exists at ${stateFilePath}`);
            return false;
        }
        // Ensure the directory exists
        const dirPath = path.dirname(stateFilePath);
        try {
            await fs.mkdir(dirPath, { recursive: true });
        }
        catch (error) {
            console.error(`Error creating directory ${dirPath}: ${error.message}`);
            return false;
        }
        try {
            // Write the final validated state to file
            await fs.writeFile(stateFilePath, JSON.stringify(completeInitialState, null, 2));
            // Update cache
            this.cache.set(featurePath, {
                state: completeInitialState,
                timestamp: Date.now()
            });
            return true;
        }
        catch (error) {
            console.error(`Error creating state at ${stateFilePath}: ${error.message}`);
            return false;
        }
    }
    /**
     * Update an existing state for a given feature path
     * Writes the state to the distributed file and updates cache
     */
    async update(featurePath, state) {
        return this.set(featurePath, state);
    }
    /**
     * Calculate depth automatically based on featurePath
     * Computes the nesting level by counting 'specs-tree-' occurrences in the path
     */
    computeDepth(featurePath) {
        const matches = featurePath.match(/specs-tree-/g);
        return matches ? matches.length - 1 : 0; // Subtract 1 because "specs-tree-root" doesn't count as a level
    }
    /**
     * Initialize phaseHistory consistently
     * Either uses the provided history or creates a standard initial entry
     */
    initPhaseHistory(initialState, now) {
        if (initialState.phaseHistory && initialState.phaseHistory.length > 0) {
            return [...initialState.phaseHistory];
        }
        const phase = initialState.phase || 'registered';
        return [{
                phase,
                timestamp: now,
                triggeredBy: 'StateLoader.create'
            }];
    }
    /**
     * Validates state against v3.0.0 schema using validateStateV3
     */
    validateState(state) {
        return validateStateV3(state);
    }
    /**
     * Clears cache to force re-loading
     */
    clearCache() {
        this.cache.clear();
    }
    /**
     * Gets the scan tree structure for the root directory
     */
    async getTreeStructure() {
        return await scanTreeStructure(this.specRootDir);
    }
}
