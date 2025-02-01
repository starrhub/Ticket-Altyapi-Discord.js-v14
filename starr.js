const { Client, GatewayIntentBits, Partials, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember]
});

client.commands = new Collection();
const commands = [];

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
    } else {
        console.log(`${filePath} komut dosyasında gerekli "data" veya "execute" özellikleri eksik.`);
    }
}

const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

const rest = new REST().setToken(config.token);

async function deployCommands() {
    try {
        console.log(`${commands.length} komut yükleniyor...`);

        const data = await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commands }
        );

        console.log(`${data.length} komut başarıyla yüklendi.`);
    } catch (error) {
        console.error('Komutları yüklerken bir hata oluştu:', error);
    }
}

client.on('error', error => {
    console.error('Bot bir hata ile karşılaştı:', error);
});

process.on('unhandledRejection', error => {
    console.error('İşlenmeyen bir hata oluştu:', error);
});

client.login(config.token)
    .then(() => deployCommands())
    .catch(error => {
        console.error('Bot başlatılırken bir hata oluştu:', error);
    });
