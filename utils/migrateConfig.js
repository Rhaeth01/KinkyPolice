const fs = require('fs');
const path = require('path');

// Nouvelle structure de configuration avec les sections
const newConfigStructure = {
  general: {},
  entry: {},
  modmail: {},
  tickets: {},
  logging: {},
  welcome: {},
  confession: {},
  games: {},
  kink: {}
};

function migrateConfig(oldConfig) {
  return {
    general: {
      prefix: oldConfig.prefix || '!',
      adminRole: oldConfig.staffRoleId?.[0] || '',
      modRole: oldConfig.staffRoleId?.[1] || ''
    },
    entry: {
      welcomeChannel: oldConfig.welcomeChannels?.welcomeChannelId || '',
      rulesChannel: oldConfig.welcomeChannels?.logChannelId || '',
      verificationRole: oldConfig.newMemberRoleIds || ''
    },
    modmail: {
      modmailCategory: oldConfig.modmail?.categoryId || '',
      modmailLogs: oldConfig.logsTicketsChannelId || ''
    },
    tickets: {
      ticketCategory: oldConfig.ticketCategoryId || '',
      supportRole: oldConfig.modmail?.staffRoleIds?.[0] || '',
      ticketLogs: oldConfig.logsTicketsChannelId || ''
    },
    logging: {
      modLogs: oldConfig.logChannelId || '',
      messageLogs: oldConfig.messageLogChannelId || '',
      voiceLogs: oldConfig.voiceLogChannelId || '',
      memberLogs: oldConfig.logChannelId || ''
    },
    welcome: {
      welcomeMessage: oldConfig.welcomeChannels?.welcomeMessage || '',
      rulesMessage: oldConfig.welcomeChannels?.rulesMessage || '',
      welcomeDM: ''
    },
    confession: {
      confessionChannel: oldConfig.confessionChannelId || '',
      confessionLogs: oldConfig.logsTicketsChannelId || '',
      confessionRole: oldConfig.staffRoleId?.[0] || ''
    },
    games: {
      gameChannel: oldConfig.dailyQuizChannelId || '',
      gameLeaderboard: ''
    },
    kink: {
      nsfwChannel: '',
      kinkLevels: 'false',
      kinkLogs: ''
    }
  };
}

// Charger l'ancienne configuration
const configPath = path.join(__dirname, '../config.json');
const oldConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Effectuer la migration
const newConfig = migrateConfig(oldConfig);

// Sauvegarder la nouvelle configuration
fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
console.log('Migration terminée avec succès! Nouvelle configuration sauvegardée.');
