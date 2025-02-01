const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-panel')
        .setDescription('Ticket oluşturma panelini gönderir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.reply({ 
            content: '✅ Ticket paneli başarıyla kuruluyor...', 
            ephemeral: true 
        });

        const embed = new EmbedBuilder()
            .setTitle('🎫 Ticket Oluştur')
            .setDescription('Aşağıdaki butona tıklayarak ticket oluşturabilirsiniz.\n\n' +
                '> 📝 Ticket kanalı açılmadan önce sizden ticket açma sebebi istenecektir. Doğru doldurduğunuzdan emin olunuz.\n' +
                '> ⏱️ Ekibimiz en kısa sürede size yardımcı olacaktır.\n' +
                '> ❗ Gereksiz ticket açmak ceza almanıza sebep olabilir.')
            .setColor(config.embedColor)
            .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

        const button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket')
                    .setLabel('Ticket Oluştur')
                    .setStyle('Primary')
                    .setEmoji('🎫')
            );

        await interaction.channel.send({ embeds: [embed], components: [button] });
    },
};