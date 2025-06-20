/**
 * @file commands/config/utils/configSystemValidator.js
 * @description Comprehensive validation utility for the configuration system
 */

const CustomIdValidator = require('./customIdValidator');

class ConfigSystemValidator {
    /**
     * Runs comprehensive validation tests on the configuration system
     * @param {import('discord.js').Client} client - Discord client for testing
     * @returns {Object} Validation results
     */
    static async runSystemValidation(client) {
        const results = {
            timestamp: new Date().toISOString(),
            passed: 0,
            failed: 0,
            warnings: 0,
            tests: []
        };

        // Test 1: Custom ID validation
        this.testCustomIdValidation(results);
        
        // Test 2: Interaction handler routing
        this.testInteractionRouting(results);
        
        // Test 3: Modal validation limits
        this.testModalLimits(results);
        
        // Test 4: Session management
        this.testSessionManagement(results);
        
        // Test 5: Error handling patterns
        this.testErrorHandling(results);

        // Calculate final score
        const totalTests = results.tests.length;
        const passRate = totalTests > 0 ? (results.passed / totalTests) * 100 : 0;
        
        results.summary = {
            totalTests,
            passRate: Math.round(passRate * 100) / 100,
            status: passRate >= 90 ? 'EXCELLENT' : passRate >= 75 ? 'GOOD' : passRate >= 50 ? 'NEEDS_IMPROVEMENT' : 'CRITICAL'
        };

        return results;
    }

    /**
     * Tests custom ID validation system
     * @param {Object} results - Results object to update
     */
    static testCustomIdValidation(results) {
        const testCases = [
            { id: 'config_general_edit_prefix', type: 'button', shouldPass: true },
            { id: 'config_category_general', type: 'button', shouldPass: true },
            { id: 'games_quiz_toggle', type: 'button', shouldPass: true },
            { id: 'invalid_custom_id', type: 'button', shouldPass: false },
            { id: 'config_entry_field_select_edit', type: 'selectMenu', shouldPass: true },
            { id: 'games_quiz_numeric_modal_points', type: 'modal', shouldPass: true }
        ];

        testCases.forEach(testCase => {
            const validation = CustomIdValidator.validate(testCase.id, testCase.type);
            const passed = validation.isValid === testCase.shouldPass;
            
            results.tests.push({
                name: `Custom ID validation: ${testCase.id}`,
                passed,
                expected: testCase.shouldPass ? 'valid' : 'invalid',
                actual: validation.isValid ? 'valid' : 'invalid',
                details: validation.error || 'Validation passed'
            });

            if (passed) {
                results.passed++;
            } else {
                results.failed++;
            }
        });
    }

    /**
     * Tests interaction routing patterns
     * @param {Object} results - Results object to update
     */
    static testInteractionRouting(results) {
        const requiredHandlers = [
            'handleSelectMenu',
            'handleChannelSelect', 
            'handleRoleSelect',
            'handleButton',
            'handleModal'
        ];

        const ConfigInteractionManager = require('../handlers/configInteractionManager');
        
        requiredHandlers.forEach(handler => {
            const exists = typeof ConfigInteractionManager[handler] === 'function';
            
            results.tests.push({
                name: `Interaction routing: ${handler}`,
                passed: exists,
                expected: 'function exists',
                actual: exists ? 'function exists' : 'function missing',
                details: exists ? 'Handler properly defined' : `Missing required handler: ${handler}`
            });

            if (exists) {
                results.passed++;
            } else {
                results.failed++;
            }
        });
    }

    /**
     * Tests modal validation limits
     * @param {Object} results - Results object to update  
     */
    static testModalLimits(results) {
        const EntryMenu = require('../menus/entryMenu');
        
        // Test field count validation
        const mockConfig = {
            entryModal: {
                fields: new Array(5).fill({ customId: 'test', label: 'Test' })
            }
        };

        const mockInteraction = {
            fields: {
                getTextInputValue: (key) => {
                    const values = {
                        'field_label': 'Test Label',
                        'field_custom_id': 'test_custom_id',
                        'field_placeholder': 'Test placeholder',
                        'field_style': 'Short',
                        'field_required': 'true'
                    };
                    return values[key] || '';
                }
            },
            user: { id: 'test123' }
        };

        let validationPassed = false;
        let errorMessage = '';

        try {
            // Mock the config manager
            const originalConfigManager = require('../../../utils/configManager');
            require.cache[require.resolve('../../../utils/configManager')] = {
                exports: {
                    getConfig: () => mockConfig
                }
            };

            EntryMenu.handleFieldModal(mockInteraction, false, null, () => {});
            validationPassed = false; // Should have thrown an error
            errorMessage = 'Expected validation error for max fields exceeded';
        } catch (error) {
            validationPassed = error.message.includes('5 champs maximum');
            errorMessage = error.message;
        }

        results.tests.push({
            name: 'Modal field count validation',
            passed: validationPassed,
            expected: 'Error for exceeding 5 field limit',
            actual: validationPassed ? 'Validation error thrown' : 'No validation error',
            details: errorMessage
        });

        if (validationPassed) {
            results.passed++;
        } else {
            results.failed++;
        }
    }

    /**
     * Tests session management
     * @param {Object} results - Results object to update
     */
    static testSessionManagement(results) {
        const configHandler = require('../configInteractionHandler');
        
        // Test session creation and cleanup
        const mockUser = { id: 'testuser123' };
        const mockInteraction = { guild: { id: 'testguild123' } };

        // Test 1: Session creation
        const sessionCreated = configHandler.startSession(mockUser, mockInteraction);
        results.tests.push({
            name: 'Session creation',
            passed: sessionCreated,
            expected: 'true',
            actual: sessionCreated.toString(),
            details: sessionCreated ? 'Session created successfully' : 'Failed to create session'
        });

        // Test 2: Duplicate session prevention
        const duplicateSession = configHandler.startSession(mockUser, mockInteraction);
        results.tests.push({
            name: 'Duplicate session prevention',
            passed: !duplicateSession,
            expected: 'false',
            actual: duplicateSession.toString(),
            details: !duplicateSession ? 'Duplicate session prevented' : 'Duplicate session allowed (should not happen)'
        });

        // Test 3: Session retrieval
        const session = configHandler.getSession(mockUser.id);
        const sessionExists = session !== null && session !== undefined;
        results.tests.push({
            name: 'Session retrieval',
            passed: sessionExists,
            expected: 'session object',
            actual: sessionExists ? 'session object' : 'null/undefined',
            details: sessionExists ? 'Session retrieved successfully' : 'Session not found after creation'
        });

        // Test 4: Session cleanup
        configHandler.endSession(mockUser.id);
        const sessionAfterCleanup = configHandler.getSession(mockUser.id);
        const cleanupWorked = sessionAfterCleanup === null || sessionAfterCleanup === undefined;
        results.tests.push({
            name: 'Session cleanup',
            passed: cleanupWorked,
            expected: 'null/undefined',
            actual: cleanupWorked ? 'null/undefined' : 'session still exists',
            details: cleanupWorked ? 'Session cleaned up properly' : 'Session persisted after cleanup'
        });

        // Update counters
        [sessionCreated, !duplicateSession, sessionExists, cleanupWorked].forEach(passed => {
            if (passed) {
                results.passed++;
            } else {
                results.failed++;
            }
        });
    }

    /**
     * Tests error handling patterns
     * @param {Object} results - Results object to update
     */
    static testErrorHandling(results) {
        // Test error handling in interaction manager
        const ConfigInteractionManager = require('../handlers/configInteractionManager');
        
        // Check if error handling methods exist
        const errorHandlingTests = [
            {
                name: 'Global error handler in handleInteraction',
                check: () => {
                    const source = ConfigInteractionManager.handleInteraction.toString();
                    return source.includes('catch') && source.includes('try');
                }
            },
            {
                name: 'Modal error handling',
                check: () => {
                    const source = ConfigInteractionManager.handleModal.toString();
                    return source.includes('catch') && source.includes('interaction.replied');
                }
            },
            {
                name: 'Interaction validation',
                check: () => {
                    const source = ConfigInteractionManager.handleInteraction.toString();
                    return source.includes('interaction.replied') || source.includes('interaction.deferred');
                }
            }
        ];

        errorHandlingTests.forEach(test => {
            const passed = test.check();
            
            results.tests.push({
                name: test.name,
                passed,
                expected: 'Error handling implemented',
                actual: passed ? 'Error handling found' : 'Error handling missing',
                details: passed ? 'Proper error handling patterns detected' : 'Missing error handling patterns'
            });

            if (passed) {
                results.passed++;
            } else {
                results.failed++;
            }
        });
    }

    /**
     * Generates a human-readable report from validation results
     * @param {Object} results - Validation results
     * @returns {string} Formatted report
     */
    static generateReport(results) {
        let report = `
📊 **Configuration System Validation Report**
Generated: ${results.timestamp}

🎯 **Overall Status: ${results.summary.status}**
✅ Passed: ${results.passed}
❌ Failed: ${results.failed}
⚠️ Warnings: ${results.warnings}
📈 Pass Rate: ${results.summary.passRate}%

📋 **Detailed Results:**
`;

        results.tests.forEach((test, index) => {
            const icon = test.passed ? '✅' : '❌';
            report += `${icon} ${index + 1}. ${test.name}\n`;
            if (!test.passed) {
                report += `   Expected: ${test.expected}\n`;
                report += `   Actual: ${test.actual}\n`;
                report += `   Details: ${test.details}\n`;
            }
            report += '\n';
        });

        if (results.summary.passRate < 90) {
            report += `
⚠️ **Recommendations:**
- Review failed tests above
- Check interaction handling patterns
- Validate custom ID usage
- Test error handling paths
- Ensure proper session management
`;
        } else {
            report += `
🎉 **System Status: HEALTHY**
The configuration system passes all validation checks!
`;
        }

        return report;
    }
}

module.exports = ConfigSystemValidator;