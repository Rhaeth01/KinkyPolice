const { showMainDashboard, createCategorySelectMenu, createQuickActionsRow } = require('./dashboardView');
const { showCategoryView } = require('./categoryView');
const { showSectionEditor, formatDisplayValue, createSectionEmbed, createFieldComponents } = require('./sectionView');

module.exports = {
    // Dashboard views
    showMainDashboard,
    createCategorySelectMenu,
    createQuickActionsRow,
    
    // Category views
    showCategoryView,
    
    // Section views
    showSectionEditor,
    formatDisplayValue,
    createSectionEmbed,
    createFieldComponents
};